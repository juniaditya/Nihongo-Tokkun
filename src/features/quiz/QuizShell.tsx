'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizSessionData, QuizQuestion, QuizOption } from '@/lib/quizTypes';
import type { QuizAnswerSubmission, QuizAttemptSubmission, WrongReasonKey } from '@/lib/runtimeDtos';
import { QuizHeader } from './QuizHeader';
import { QuizProgress } from './QuizProgress';
import { PassageDisplay } from './PassageDisplay';
import { QuestionPrompt } from './QuestionPrompt';
import { AnswerOption } from './AnswerOption';
import { AnswerFeedback } from './AnswerFeedback';
import { ExitQuizDialog } from './ExitQuizDialog';
import { QuizResult } from './QuizResult';
import { SectionPicker } from './SectionPicker';

type Phase = 'section_pick' | 'quiz_active' | 'exit_confirm' | 'quiz_done';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface QuizShellProps { session: QuizSessionData; }

const CATEGORY_LABELS: Record<QuizSessionData['lesson']['category'], string> = {
  kotoba: '言葉 Kotoba',
  bunpou: '文法 Bunpou',
  dokkai: '読解 Dokkai',
};

const CATEGORY_ACCENT: Record<QuizSessionData['lesson']['category'], string> = {
  kotoba: 'text-teal-400',
  bunpou: 'text-blue-400',
  dokkai: 'text-violet-400',
};

function makeClientKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `quiz-${crypto.randomUUID().replace(/-/g, '')}`;
  return `quiz-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function QuizShell({ session }: QuizShellProps) {
  const router = useRouter();
  const skipPicker = session.mode === 'mixed' || session.lesson.category === 'dokkai' || session.section != null || session.availableSections.length <= 1;
  const [phase, setPhase] = useState<Phase>(skipPicker ? 'quiz_active' : 'section_pick');
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(session.questions);
  const [selectedSection, setSelectedSection] = useState<string | null>(session.section);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<QuizOption | null>(null);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerSubmission[]>([]);
  const [wrongReason, setWrongReason] = useState<WrongReasonKey | ''>('');
  const [wrongReasonOther, setWrongReasonOther] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [serverScore, setServerScore] = useState<number | null>(null);

  const startedAtRef = useRef(new Date().toISOString());
  const startedAtMsRef = useRef(Date.now());
  const questionStartedAtMsRef = useRef(Date.now());
  const clientAttemptKeyRef = useRef(makeClientKey());
  const pendingAnswerRef = useRef<QuizAnswerSubmission | null>(null);
  const finalAnswersRef = useRef<QuizAnswerSubmission[]>([]);

  const currentQuestion = activeQuestions[questionIndex] ?? null;
  const isLast = questionIndex === activeQuestions.length - 1;
  const categoryLabel = CATEGORY_LABELS[session.lesson.category];
  const accentClass = CATEGORY_ACCENT[session.lesson.category];

  const resetAttemptClock = useCallback(() => {
    const now = Date.now();
    startedAtMsRef.current = now;
    startedAtRef.current = new Date(now).toISOString();
    questionStartedAtMsRef.current = now;
    clientAttemptKeyRef.current = makeClientKey();
  }, []);

  const handleSectionSelect = useCallback((sec: string | null) => {
    const filtered = sec == null ? session.questions : session.questions.filter((q) => q.section === sec);
    setSelectedSection(sec);
    setActiveQuestions(filtered);
    setQuestionIndex(0);
    setSelectedOption(null);
    setCorrect(0);
    setAnswers([]);
    finalAnswersRef.current = [];
    pendingAnswerRef.current = null;
    setWrongReason('');
    setWrongReasonOther('');
    setSaveState('idle');
    setSaveMessage('');
    setServerScore(null);
    resetAttemptClock();
    setPhase('quiz_active');
  }, [resetAttemptClock, session.questions]);

  const handleSelect = useCallback((option: QuizOption) => {
    if (selectedOption != null || !currentQuestion) return;
    const answeredAt = new Date().toISOString();
    pendingAnswerRef.current = {
      questionSourceId: currentQuestion.sourceId,
      questionIndex,
      selectedAnswer: option.text,
      responseTimeMs: Math.max(0, Date.now() - questionStartedAtMsRef.current),
      answeredAt,
      wrongReason: '',
      wrongReasonOther: '',
    };
    setSelectedOption(option);
    if (option.isCorrect) setCorrect((value) => value + 1);
  }, [currentQuestion, questionIndex, selectedOption]);

  const buildPayload = useCallback((finalAnswers: QuizAnswerSubmission[]): QuizAttemptSubmission => {
    const completedAt = new Date().toISOString();
    const bagian = session.lesson.category === 'dokkai'
      ? 'sesi'
      : session.mode === 'mixed'
      ? 'mixed'
      : selectedSection ?? currentQuestion?.section ?? 'latihan';
    return {
      clientAttemptKey: clientAttemptKeyRef.current,
      startedAt: startedAtRef.current,
      completedAt,
      durationMs: Math.max(0, Date.now() - startedAtMsRef.current),
      kategori: session.lesson.category,
      nomor: session.lesson.lessonNumber,
      bagian,
      answers: finalAnswers,
    };
  }, [currentQuestion?.section, selectedSection, session.lesson.category, session.lesson.lessonNumber, session.mode]);

  const saveAttempt = useCallback(async (finalAnswers: QuizAnswerSubmission[]) => {
    if (!finalAnswers.length || saveState === 'saving' || saveState === 'saved') return;
    setSaveState('saving');
    setSaveMessage('Menyimpan progress ke Supabase...');
    try {
      const response = await fetch('/api/quiz-attempt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildPayload(finalAnswers)),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
      setServerScore(Number(body.skor ?? 0));
      setSaveState('saved');
      setSaveMessage('Progress tersimpan ✓');
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : String(error));
    }
  }, [buildPayload, saveState]);

  const handleNext = useCallback(() => {
    const pending = pendingAnswerRef.current;
    if (!pending || !selectedOption) return;
    if (!selectedOption.isCorrect && !wrongReason) return;
    if (!selectedOption.isCorrect && wrongReason === 'lainnya' && !wrongReasonOther.trim()) return;
    const completedAnswer: QuizAnswerSubmission = {
      ...pending,
      wrongReason: selectedOption.isCorrect ? '' : wrongReason,
      wrongReasonOther: selectedOption.isCorrect ? '' : wrongReasonOther.trim(),
    };
    const nextAnswers = [...answers, completedAnswer];
    setAnswers(nextAnswers);
    finalAnswersRef.current = nextAnswers;
    pendingAnswerRef.current = null;
    setWrongReason('');
    setWrongReasonOther('');

    if (isLast) {
      setPhase('quiz_done');
      void saveAttempt(nextAnswers);
    } else {
      setQuestionIndex((value) => value + 1);
      setSelectedOption(null);
      questionStartedAtMsRef.current = Date.now();
    }
  }, [answers, isLast, saveAttempt, selectedOption, wrongReason, wrongReasonOther]);

  const handleExitRequest = useCallback(() => setPhase('exit_confirm'), []);
  const handleExitCancel = useCallback(() => setPhase('quiz_active'), []);
  const handleExitConfirm = useCallback(() => router.push('/courses'), [router]);

  const handleRetry = useCallback(() => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setCorrect(0);
    setAnswers([]);
    finalAnswersRef.current = [];
    pendingAnswerRef.current = null;
    setWrongReason('');
    setWrongReasonOther('');
    setSaveState('idle');
    setSaveMessage('');
    setServerScore(null);
    resetAttemptClock();
    setPhase(skipPicker ? 'quiz_active' : 'section_pick');
  }, [resetAttemptClock, skipPicker]);

  const currentPassage = currentQuestion?.passageSourceId != null ? session.passages[currentQuestion.passageSourceId] ?? null : null;

  function getOptionState(opt: QuizOption): 'idle' | 'selected-correct' | 'selected-wrong' | 'revealed-correct' {
    if (selectedOption == null) return 'idle';
    if (opt.id === selectedOption.id) return opt.isCorrect ? 'selected-correct' : 'selected-wrong';
    if (opt.isCorrect) return 'revealed-correct';
    return 'idle';
  }

  return (
    <>
      <ExitQuizDialog open={phase === 'exit_confirm'} onCancel={handleExitCancel} onConfirm={handleExitConfirm} />
      <main className="quiz-page-shell">
        <QuizHeader
          categoryLabel={categoryLabel}
          lessonLabel={session.lesson.label}
          accentClass={accentClass}
          phase={phase === 'quiz_active' || phase === 'exit_confirm' ? 'active' : phase === 'quiz_done' ? 'done' : 'pre'}
          onExitRequest={handleExitRequest}
        />

        {phase === 'section_pick' && (
          <SectionPicker lessonLabel={session.lesson.label} sections={session.availableSections} totalQuestions={session.questions.length} onSelectSection={handleSectionSelect} />
        )}

        {(phase === 'quiz_active' || phase === 'exit_confirm') && currentQuestion != null && (
          <>
            <QuizProgress current={questionIndex + 1} total={activeQuestions.length} correct={correct} />
            {currentPassage && <PassageDisplay passage={currentPassage} />}
            <section className="quiz-question-card" aria-label={`Soal ${questionIndex + 1} dari ${activeQuestions.length}`}>
              <QuestionPrompt questionNumber={questionIndex + 1} total={activeQuestions.length} prompt={currentQuestion.prompt} section={currentQuestion.section} />
              <div className="quiz-option-list" role="group" aria-labelledby="question-prompt">
                {currentQuestion.options.map((opt) => (
                  <AnswerOption key={opt.id} option={opt} state={getOptionState(opt)} disabled={selectedOption != null} onSelect={handleSelect} />
                ))}
              </div>
              {selectedOption != null && (
                <AnswerFeedback
                  selectedOption={selectedOption}
                  onNext={handleNext}
                  isLast={isLast}
                  wrongReason={wrongReason}
                  wrongReasonOther={wrongReasonOther}
                  onWrongReasonChange={setWrongReason}
                  onWrongReasonOtherChange={setWrongReasonOther}
                />
              )}
            </section>
          </>
        )}

        {phase === 'quiz_done' && (
          <QuizResult
            lessonId={session.lesson.id}
            lessonLabel={session.lesson.label}
            correct={correct}
            total={activeQuestions.length}
            onRetry={handleRetry}
            saveState={saveState}
            saveMessage={saveMessage}
            onRetrySave={() => void saveAttempt(finalAnswersRef.current)}
            serverScore={serverScore}
          />
        )}
      </main>
    </>
  );
}
