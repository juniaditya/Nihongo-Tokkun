'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizAnswerSubmission, QuizAttemptSubmission, WrongReasonKey } from '@/lib/runtimeDtos';
import type { QuizOption, QuizQuestion, QuizSessionData } from '@/lib/quizTypes';
import { NewMaterialPanel } from '@/components/NewMaterialPanel';
import { AnswerOption } from './AnswerOption';
import { ExitQuizDialog } from './ExitQuizDialog';
import { PassageDisplay } from './PassageDisplay';
import { QuizHeader } from './QuizHeader';
import { QuizResult } from './QuizResult';

const DOKKAI_ORDER = ['tanbun', 'chuubun', 'tougou', 'chobun', 'jouhou'] as const;
const DOKKAI_LABELS: Record<string, string> = {
  tanbun: '内容理解（短文）',
  chuubun: '内容理解（中文）',
  tougou: '統合理解',
  chobun: '主張理解（長文）',
  jouhou: '情報検索',
};

const WRONG_REASONS: Array<{ key: WrongReasonKey; label: string }> = [
  { key: 'lupa_arti', label: 'Lupa artinya' },
  { key: 'tidak_ngerti', label: 'Tidak mengerti soal/bacaan' },
  { key: 'buru_buru', label: 'Terburu-buru / salah klik' },
  { key: 'terkecoh', label: 'Terkecoh pilihan lain' },
  { key: 'salah_baca', label: 'Salah baca soal' },
  { key: 'lainnya', label: 'Lainnya' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Phase = 'active' | 'exit_confirm' | 'done';

function makeClientKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `dokkai-${crypto.randomUUID().replace(/-/g, '')}`;
  return `dokkai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function optionState(option: QuizOption, selected: QuizOption | undefined, revealed: boolean) {
  if (!revealed) return selected?.id === option.id ? 'selected' as const : 'idle' as const;
  if (selected?.id === option.id) return option.isCorrect ? 'selected-correct' as const : 'selected-wrong' as const;
  if (option.isCorrect) return 'revealed-correct' as const;
  return 'idle' as const;
}

export function DokkaiSession({ session }: { session: QuizSessionData }) {
  const router = useRouter();
  const groups = useMemo(() => {
    const bySection = new Map<string, QuizQuestion[]>();
    for (const question of session.questions) {
      const bucket = bySection.get(question.section) ?? [];
      bucket.push(question);
      bySection.set(question.section, bucket);
    }
    return DOKKAI_ORDER
      .filter((section) => bySection.has(section))
      .map((section) => ({
        section,
        label: DOKKAI_LABELS[section] ?? section,
        questions: (bySection.get(section) ?? []).slice().sort((a, b) => a.questionIndex - b.questionIndex),
      }));
  }, [session.questions]);

  const [phase, setPhase] = useState<Phase>('active');
  const [groupIndex, setGroupIndex] = useState(0);
  const [selected, setSelected] = useState<Record<string, QuizOption>>({});
  const [revealed, setRevealed] = useState(false);
  const [wrongReasons, setWrongReasons] = useState<Record<string, WrongReasonKey | ''>>({});
  const [wrongReasonOther, setWrongReasonOther] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<QuizAnswerSubmission[]>([]);
  const [correct, setCorrect] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [serverScore, setServerScore] = useState<number | null>(null);

  const startedAtRef = useRef(new Date().toISOString());
  const startedAtMsRef = useRef(Date.now());
  const clientAttemptKeyRef = useRef(makeClientKey());
  const responseTimesRef = useRef<Record<string, number>>({});
  const answeredAtRef = useRef<Record<string, string>>({});
  const groupStartedAtRef = useRef(Date.now());
  const finalAnswersRef = useRef<QuizAnswerSubmission[]>([]);

  const group = groups[groupIndex] ?? null;
  const passageSourceId = group?.questions[0]?.passageSourceId ?? null;
  const passage = passageSourceId ? session.passages[passageSourceId] ?? null : null;
  const isLastGroup = groupIndex === groups.length - 1;
  const selectedCount = group ? group.questions.filter((q) => selected[q.id]).length : 0;
  const allAnswered = !!group && selectedCount === group.questions.length;

  const wrongQuestions = useMemo(() => {
    if (!group || !revealed) return [] as QuizQuestion[];
    return group.questions.filter((question) => !selected[question.id]?.isCorrect);
  }, [group, revealed, selected]);

  const reasonsReady = wrongQuestions.every((question) => {
    const reason = wrongReasons[question.id] ?? '';
    return reason !== '' && (reason !== 'lainnya' || (wrongReasonOther[question.id] ?? '').trim() !== '');
  });

  const buildPayload = useCallback((finalAnswers: QuizAnswerSubmission[]): QuizAttemptSubmission => ({
    clientAttemptKey: clientAttemptKeyRef.current,
    startedAt: startedAtRef.current,
    completedAt: new Date().toISOString(),
    durationMs: Math.max(0, Date.now() - startedAtMsRef.current),
    kategori: 'dokkai',
    nomor: session.lesson.lessonNumber,
    bagian: 'sesi',
    answers: finalAnswers,
  }), [session.lesson.lessonNumber]);

  const saveAttempt = useCallback(async (finalAnswers: QuizAnswerSubmission[]) => {
    if (!finalAnswers.length || saveState === 'saving' || saveState === 'saved') return;
    setSaveState('saving');
    setSaveMessage('Menyimpan progress Dokkai ke Supabase...');
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

  const handleSelect = useCallback((question: QuizQuestion, option: QuizOption) => {
    if (revealed) return;
    if (!selected[question.id]) {
      responseTimesRef.current[question.id] = Math.max(0, Date.now() - groupStartedAtRef.current);
      answeredAtRef.current[question.id] = new Date().toISOString();
    }
    setSelected((current) => ({ ...current, [question.id]: option }));
  }, [revealed, selected]);

  const revealGroup = useCallback(() => {
    if (!allAnswered || revealed) return;
    setRevealed(true);
    const groupCorrect = group?.questions.filter((question) => selected[question.id]?.isCorrect).length ?? 0;
    setCorrect((value) => value + groupCorrect);
  }, [allAnswered, group, revealed, selected]);

  const continueFromReview = useCallback(() => {
    if (!group || !revealed || !reasonsReady) return;
    const sectionAnswers: QuizAnswerSubmission[] = group.questions.map((question) => {
      const chosen = selected[question.id];
      const reason = chosen.isCorrect ? '' : (wrongReasons[question.id] ?? '');
      return {
        questionSourceId: question.sourceId,
        questionIndex: question.questionIndex,
        selectedAnswer: chosen.text,
        responseTimeMs: responseTimesRef.current[question.id] ?? 0,
        answeredAt: answeredAtRef.current[question.id] ?? new Date().toISOString(),
        wrongReason: reason,
        wrongReasonOther: reason === 'lainnya' ? (wrongReasonOther[question.id] ?? '').trim() : '',
      };
    });
    const nextAnswers = [...answers, ...sectionAnswers];
    setAnswers(nextAnswers);
    finalAnswersRef.current = nextAnswers;

    if (isLastGroup) {
      setPhase('done');
      void saveAttempt(nextAnswers);
      return;
    }

    setGroupIndex((value) => value + 1);
    setSelected({});
    setRevealed(false);
    setWrongReasons({});
    setWrongReasonOther({});
    responseTimesRef.current = {};
    answeredAtRef.current = {};
    groupStartedAtRef.current = Date.now();
  }, [answers, group, isLastGroup, reasonsReady, revealed, saveAttempt, selected, wrongReasonOther, wrongReasons]);

  const retry = useCallback(() => {
    setPhase('active');
    setGroupIndex(0);
    setSelected({});
    setRevealed(false);
    setWrongReasons({});
    setWrongReasonOther({});
    setAnswers([]);
    setCorrect(0);
    setSaveState('idle');
    setSaveMessage('');
    setServerScore(null);
    responseTimesRef.current = {};
    answeredAtRef.current = {};
    groupStartedAtRef.current = Date.now();
    finalAnswersRef.current = [];
    const now = Date.now();
    startedAtMsRef.current = now;
    startedAtRef.current = new Date(now).toISOString();
    clientAttemptKeyRef.current = makeClientKey();
  }, []);

  if (!group && phase !== 'done') {
    return (
      <div className="panel fade-in result-panel">
        <h2>Tidak ada soal Dokkai.</h2>
        <div className="action-row"><button className="btn-primary" onClick={() => router.push('/courses')}>Kembali ke Kursus</button></div>
      </div>
    );
  }

  return (
    <>
      <ExitQuizDialog
        open={phase === 'exit_confirm'}
        onCancel={() => setPhase('active')}
        onConfirm={() => router.push('/courses')}
      />

      <main className="quiz-page-shell dokkai-grouped-shell">
        <QuizHeader
          categoryLabel="読解 Dokkai"
          lessonLabel={session.lesson.label}
          accentClass="text-violet-400"
          phase={phase === 'done' ? 'done' : 'active'}
          onExitRequest={() => setPhase('exit_confirm')}
        />

        {phase !== 'done' && group && (
          <>
            <div className="dokkai-section-progress">
              <div className="dokkai-section-tabs" aria-label="Bagian Dokkai">
                {groups.map((item, index) => (
                  <span key={item.section} className={`${index === groupIndex ? 'active' : ''} ${index < groupIndex ? 'done' : ''}`}>
                    {index + 1}. {item.label}
                  </span>
                ))}
              </div>
              <p>{group.label} · {group.questions.length} soal · terjawab {selectedCount}/{group.questions.length}</p>
            </div>

            <NewMaterialPanel />

            {passage && <PassageDisplay passage={passage} />}

            <div className="dokkai-question-stack">
              {group.questions.map((question, index) => {
                const chosen = selected[question.id];
                const correctOption = question.options.find((option) => option.isCorrect) ?? null;
                const wrongReason = wrongReasons[question.id] ?? '';
                return (
                  <section key={question.id} className="dokkai-question-card" aria-label={`Soal ${index + 1} pada ${group.label}`}>
                    <div className="dokkai-question-heading">
                      <span className="dokkai-question-number">{index + 1}</span>
                      <p lang="ja">{question.prompt}</p>
                    </div>
                    <div className="quiz-option-list">
                      {question.options.map((option) => (
                        <AnswerOption
                          key={option.id}
                          option={option}
                          state={optionState(option, chosen, revealed)}
                          disabled={revealed}
                          onSelect={(value) => handleSelect(question, value)}
                        />
                      ))}
                    </div>

                    {revealed && chosen && (
                      <div className={`dokkai-inline-feedback ${chosen.isCorrect ? 'correct' : 'wrong'}`}>
                        <p className="quiz-feedback-title">{chosen.isCorrect ? '✓ Benar' : '✗ Salah'}</p>
                        {correctOption?.explanation && (
                          <div className="answer-explanation answer-explanation-correct">
                            <strong>✓ Kenapa “{correctOption.text}” benar</strong>
                            <p lang="ja">{correctOption.explanation}</p>
                          </div>
                        )}
                        {!chosen.isCorrect && chosen.explanation && (
                          <div className="answer-explanation answer-explanation-wrong">
                            <strong>✗ Kenapa “{chosen.text}” salah</strong>
                            <p lang="ja">{chosen.explanation}</p>
                          </div>
                        )}

                        {!chosen.isCorrect && (
                          <div className="wrong-reason-panel">
                            <p className="wrong-reason-title">Kenapa jawabanmu salah?</p>
                            <div className="wrong-reason-options">
                              {WRONG_REASONS.map((reason) => (
                                <button
                                  key={reason.key}
                                  type="button"
                                  className={`wrong-reason-btn ${wrongReason === reason.key ? 'active' : ''}`}
                                  onClick={() => setWrongReasons((current) => ({ ...current, [question.id]: reason.key }))}
                                >
                                  {reason.label}
                                </button>
                              ))}
                            </div>
                            {wrongReason === 'lainnya' && (
                              <textarea
                                className="wrong-reason-other"
                                rows={2}
                                placeholder="Tuliskan alasan singkat..."
                                value={wrongReasonOther[question.id] ?? ''}
                                onChange={(event) => setWrongReasonOther((current) => ({ ...current, [question.id]: event.target.value }))}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="dokkai-section-actions">
              {!revealed ? (
                <button type="button" className="btn-primary" disabled={!allAnswered} onClick={revealGroup}>
                  Lihat Pembahasan {group.label} →
                </button>
              ) : (
                <>
                  {!reasonsReady && wrongQuestions.length > 0 && <p className="muted">Isi alasan untuk semua jawaban yang salah sebelum lanjut.</p>}
                  <button type="button" className="btn-primary" disabled={!reasonsReady} onClick={continueFromReview}>
                    {isLastGroup ? 'Lihat Hasil Akhir →' : 'Lanjut ke Bagian Berikutnya →'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {phase === 'done' && (
          <QuizResult
            lessonId={session.lesson.id}
            lessonLabel={session.lesson.label}
            correct={correct}
            total={session.questions.length}
            onRetry={retry}
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
