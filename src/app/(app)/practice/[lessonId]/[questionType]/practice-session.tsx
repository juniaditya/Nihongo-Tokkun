'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PracticeSkeleton } from '@/components/practice/practice-skeleton';
import { PracticeHeader } from '@/components/practice/practice-header';
import { QuestionCard } from '@/components/practice/question-card';
import { OptionCard } from '@/components/practice/option-card';
import { FeedbackPanel } from '@/components/practice/feedback-panel';
import { ResultScreen, type PracticeProgressDetails } from '@/components/practice/result-screen';
import { DokkaiReader, type DokkaiPassage } from '@/components/practice/dokkai-reader';
import type { MistakePreset } from '@/components/practice/mistake-logger';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import type { Database } from '@/types/database.types';

type SafeQuestionRow = Database['public']['Views']['v_practice_questions']['Row'];
type SafeOptionRow = Database['public']['Views']['v_practice_question_options']['Row'];
type AttemptRow = Database['public']['Tables']['question_attempts']['Row'];

interface OptionItem {
  id: string;
  question_id: string;
  option_text: string;
  option_order: number;
}

interface QuestionItem {
  id: string;
  lesson_id: string;
  question_type: string;
  question_text: string;
  sort_order: number;
  passage_id: string | null;
  options: OptionItem[];
}

interface FeedbackState {
  attempt_id: string;
  selected_option_id: string;
  is_correct: boolean;
  already_answered: boolean;
  question_explanation?: string | null;
  selected_option_explanation?: string | null;
  correct_option_id?: string | null;
  correct_option_explanation?: string | null;
}

interface ResultState {
  session_id: string;
  score: number;
  passing_grade_percent: number;
  passed: boolean;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
}

interface StartSessionResponse {
  session_id: string;
  already_existing: boolean;
  started_at: string;
  total_questions: number;
  time_limit_seconds: number | null;
}

interface PracticeSessionProps {
  lessonId: string;
  questionType: string;
  lessonTitle: string;
  category: 'kotoba' | 'bunpou' | 'dokkai';
  questionTypeLabel: string;
  mistakePresets: MistakePreset[];
}

export function PracticeSession({
  lessonId,
  questionType,
  lessonTitle,
  category,
  questionTypeLabel,
  mistakePresets,
}: PracticeSessionProps) {
  const supabase = createClient();

  // Lifecycle & Session State
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);

  // Questions & Navigation State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Passage state (Dokkai)
  const [passageMap, setPassageMap] = useState<Map<string, DokkaiPassage>>(new Map());

  // Feedback & Answered Map State
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);
  const [answeredMap, setAnsweredMap] = useState<Map<string, FeedbackState>>(new Map());

  // Final Result State
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [progress, setProgress] = useState<PracticeProgressDetails | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const progressRequestRef = useRef(0);

  const loadProgress = useCallback(async () => {
    const request = ++progressRequestRef.current;
    setIsProgressLoading(true);
    setProgressError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sesi pengguna tidak tersedia.');
      const [typeResult, lessonResult] = await Promise.all([
        supabase.from('lesson_type_progress').select('best_score, attempts_count, passed')
          .eq('user_id', user.id).eq('lesson_id', lessonId).eq('question_type', questionType).maybeSingle(),
        supabase.from('lesson_progress').select('status, completed_at')
          .eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle(),
      ]);
      if (request !== progressRequestRef.current) return;
      setProgress({ type: typeResult.data, lesson: lessonResult.data });
      if (typeResult.error || lessonResult.error) throw new Error(typeResult.error?.message || lessonResult.error?.message);
    } catch (error: unknown) {
      console.error('[PracticeSession] progress error:', error);
      if (request === progressRequestRef.current) setProgressError('Detail progres gagal dimuat.');
    } finally {
      if (request === progressRequestRef.current) setIsProgressLoading(false);
    }
  }, [supabase, lessonId, questionType]);

  // Question Interaction Timer
  const questionStartTimeRef = useRef<number>(Date.now());

  // Finalize practice session
  const handleFinalize = useCallback(
    async (targetSessionId: string) => {
      try {
        setIsFinalizing(true);
        const { data: finData, error: finErr } = await (supabase.rpc as any)(
          'finalize_practice_session',
          { p_session_id: targetSessionId }
        );

        if (finErr || !finData) {
          throw new Error(finErr?.message || 'Gagal menyelesaikan sesi latihan.');
        }

        const payload = finData as unknown as ResultState;
        setResultState(payload);
        void loadProgress();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menyelesaikan sesi latihan.';
        console.error('[PracticeSession] finalize error:', message);
        setSubmitError(message);
      } finally {
        setIsFinalizing(false);
      }
    },
    [supabase, loadProgress]
  );

  // Initialize or resume practice session
  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setInitError(null);
      setResultState(null);
      setFeedbackState(null);
      setSelectedOptionId(null);
      setAnsweredMap(new Map());
      setQuestions([]);
      setPassageMap(new Map());
      setCurrentIndex(0);
      setSessionId(null);
      setStartedAt(null);
      setTimeLimitSeconds(null);
      setSubmitError(null);
      setIsSubmitting(false);
      setProgress(null);
      setProgressError(null);
      setIsProgressLoading(false);
      progressRequestRef.current += 1;
      questionStartTimeRef.current = Date.now();

      // 1. Call start_practice_session RPC
      const { data: startData, error: startErr } = await (supabase.rpc as any)(
        'start_practice_session',
        {
          p_lesson_id: lessonId,
          p_question_type: questionType,
        }
      );

      if (startErr || !startData) {
        throw new Error(startErr?.message || 'Gagal memulai sesi latihan.');
      }

      const startPayload = startData as unknown as StartSessionResponse;

      const currentSessionId = startPayload.session_id;
      setSessionId(currentSessionId);
      setStartedAt(startPayload.started_at);
      setTimeLimitSeconds(startPayload.time_limit_seconds);

      // 2. Fetch questions from safe view: v_practice_questions
      const { data: rawQuestions, error: qErr } = await supabase
        .from('v_practice_questions')
        .select('id, lesson_id, question_type, question_text, sort_order, passage_id')
        .eq('lesson_id', lessonId)
        .eq('question_type', questionType)
        .order('sort_order', { ascending: true });

      if (qErr || !rawQuestions) {
        throw new Error(qErr?.message || 'Tidak ada soal aktif untuk tipe latihan ini.');
      }

      const questionsData = rawQuestions as SafeQuestionRow[];
      if (questionsData.length !== startPayload.total_questions) {
        throw new Error('Materi latihan berubah sejak sesi ini dimulai.');
      }
      if (questionsData.length === 0) throw new Error('Tidak ada soal aktif untuk tipe latihan ini.');
      const questionIds = questionsData.map((q) => q.id);

      // 3. Fetch options from safe view: v_practice_question_options
      const { data: rawOptions, error: optErr } = await supabase
        .from('v_practice_question_options')
        .select('id, question_id, option_text, option_order')
        .in('question_id', questionIds)
        .order('option_order', { ascending: true });

      if (optErr || !rawOptions) {
        throw new Error(optErr?.message || 'Gagal memuat opsi jawaban.');
      }

      const optionsData = rawOptions as SafeOptionRow[];

      // Assemble questions with their options
      const optionsByQ = new Map<string, OptionItem[]>();
      for (const opt of optionsData) {
        const list = optionsByQ.get(opt.question_id) || [];
        list.push({
          id: opt.id,
          question_id: opt.question_id,
          option_text: opt.option_text,
          option_order: opt.option_order,
        });
        optionsByQ.set(opt.question_id, list);
      }

      const assembledQuestions: QuestionItem[] = questionsData.map((q) => ({
        id: q.id,
        lesson_id: q.lesson_id,
        question_type: q.question_type,
        question_text: q.question_text,
        sort_order: q.sort_order,
        passage_id: q.passage_id ?? null,
        options: optionsByQ.get(q.id) || [],
      }));

      // 4. Fetch unique dokkai passages (if any questions reference a passage)
      const passageIds = [...new Set(
        assembledQuestions.map((q) => q.passage_id).filter(Boolean) as string[]
      )];

      if (passageIds.length > 0) {
        const { data: rawPassages, error: passErr } = await supabase
          .from('dokkai_passages')
          .select('id, title, passage_type, passage, passage_a, passage_b')
          .in('id', passageIds);

        if (!passErr && rawPassages) {
          const newPassageMap = new Map<string, DokkaiPassage>();
          for (const p of rawPassages as DokkaiPassage[]) {
            newPassageMap.set(p.id, p);
          }
          setPassageMap(newPassageMap);
        }
      }

      setQuestions(assembledQuestions);

      // 4. If resuming existing session, load existing attempts to restore state
      if (startPayload.already_existing) {
        const { data: rawAttempts } = await supabase
          .from('question_attempts')
          .select('id, question_id, selected_option_id, is_correct')
          .eq('session_id', currentSessionId);

        const attemptsData = (rawAttempts || []) as Array<
          Pick<AttemptRow, 'id' | 'question_id' | 'selected_option_id' | 'is_correct'>
        >;

        if (attemptsData.length > 0) {
          const newAnsweredMap = new Map<string, FeedbackState>();
          for (const att of attemptsData) {
            newAnsweredMap.set(att.question_id, {
              attempt_id: att.id,
              selected_option_id: att.selected_option_id ?? '',
              is_correct: att.is_correct ?? false,
              already_answered: true,
            });
          }
          setAnsweredMap(newAnsweredMap);

          // Find first unanswered question
          const firstUnansweredIdx = assembledQuestions.findIndex(
            (q) => !newAnsweredMap.has(q.id)
          );

          if (firstUnansweredIdx === -1) {
            // All questions already answered -> finalize session
            await handleFinalize(currentSessionId);
            return;
          } else {
            setCurrentIndex(firstUnansweredIdx);
          }
        } else {
          setCurrentIndex(0);
        }
      } else {
        setCurrentIndex(0);
      }

      questionStartTimeRef.current = Date.now();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat sesi latihan.';
      console.error('[PracticeSession] initSession error:', message);
      setInitError(message);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, questionType, supabase, handleFinalize]);

  // Trigger init on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Submit current answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !selectedOptionId || isSubmitting || currentIndex >= questions.length) {
      return;
    }

    const currentQ = questions[currentIndex];
    const responseTimeMs = Math.max(0, Date.now() - questionStartTimeRef.current);

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const { data: submitData, error: submitErr } = await (supabase.rpc as any)(
        'submit_practice_answer',
        {
          p_session_id: sessionId,
          p_question_id: currentQ.id,
          p_selected_option_id: selectedOptionId,
          p_response_time_ms: responseTimeMs,
        }
      );

      if (submitErr || !submitData) {
        // If timer exceeded on server, transition to finalize immediately
        if (submitErr?.message?.includes('time limit exceeded')) {
          await handleFinalize(sessionId);
          return;
        }
        throw new Error(submitErr?.message || 'Gagal mengirim jawaban.');
      }

      const feedback = submitData as unknown as FeedbackState;

      // Authoritative state update: always honor server-returned selected_option_id
      setSelectedOptionId(feedback.selected_option_id);
      setFeedbackState(feedback);

      setAnsweredMap((prev) => {
        const next = new Map(prev);
        next.set(currentQ.id, feedback);
        return next;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim jawaban.';
      console.error('[PracticeSession] submitAnswer error:', message);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next question handler
  const handleNextQuestion = async () => {
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSelectedOptionId(null);
      setFeedbackState(null);
      setSubmitError(null);
      questionStartTimeRef.current = Date.now();
    } else {
      // Last question completed -> finalize session
      if (sessionId) {
        await handleFinalize(sessionId);
      }
    }
  };

  // Mistake reason logger
  const handleLogMistakeReason = async (
    attemptId: string,
    reason: string,
    customReason?: string
  ): Promise<boolean> => {
    try {
      const { error } = await (supabase.rpc as any)('log_mistake_reason', {
        p_attempt_id: attemptId,
        p_reason: reason,
        p_custom_reason: customReason || null,
      });

      if (error) {
        console.error('[PracticeSession] logMistake error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[PracticeSession] logMistake error:', err);
      return false;
    }
  };

  // Time expired handler
  const handleTimeExpired = useCallback(() => {
    if (sessionId && !resultState && !isFinalizing) {
      handleFinalize(sessionId);
    }
  }, [sessionId, resultState, isFinalizing, handleFinalize]);

  // Restart practice session
  const handleRetrySession = async () => {
    try {
      setIsRetrying(true);
      await initSession();
    } finally {
      setIsRetrying(false);
    }
  };

  // ─── LOADING STATE ───
  if (isLoading || isFinalizing) {
    return <PracticeSkeleton />;
  }

  // ─── ERROR STATE ───
  if (initError || !questions.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Gagal Memuat Latihan
        </h2>
        <p className="text-sm text-muted-foreground">
          {initError || 'Tidak ada soal yang tersedia untuk materi ini.'}
        </p>
        <div className="pt-2">
          <Button onClick={() => initSession()} variant="secondary" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ─── RESULT STATE ───
  if (resultState) {
    return (
      <ResultScreen
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        questionType={questionType}
        questionTypeLabel={questionTypeLabel}
        category={category}
        score={resultState.score}
        passingGradePercent={resultState.passing_grade_percent}
        passed={resultState.passed}
        correctAnswers={resultState.correct_answers}
        totalQuestions={resultState.total_questions}
        onRetry={handleRetrySession}
        isRetrying={isRetrying}
        progress={progress}
        progressError={progressError}
        isProgressLoading={isProgressLoading}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  const isSubmitted = !!feedbackState;
  const isLastQuestion = currentIndex + 1 >= questions.length;
  const currentPassage =
    currentQuestion.passage_id ? passageMap.get(currentQuestion.passage_id) ?? null : null;

  // Use wider container when a passage is displayed
  const containerWidth = currentPassage ? 'max-w-5xl' : 'max-w-2xl';

  return (
    <div className={`mx-auto ${containerWidth} px-4 py-6 md:py-8 space-y-6`}>
      {/* Header */}
      <PracticeHeader
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        category={category}
        questionTypeLabel={questionTypeLabel}
        currentIndex={currentIndex + 1}
        totalQuestions={questions.length}
        timeLimitSeconds={timeLimitSeconds}
        startedAt={startedAt}
        onTimeExpired={handleTimeExpired}
        isCompleted={!!resultState}
      />

      {/* Question Card */}
      {currentPassage && <DokkaiReader key={currentPassage.id} passage={currentPassage} />}
      <QuestionCard
        questionNumber={currentIndex + 1}
        questionText={currentQuestion.question_text}
      />

      {/* Options List */}
      <div className="grid gap-3" role="radiogroup" aria-label="Pilihan jawaban">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = isSubmitted && feedbackState?.correct_option_id === opt.id;
          const isAuthoritativeSelected =
            isSubmitted && feedbackState?.selected_option_id === opt.id;

          return (
            <OptionCard
              key={opt.id}
              id={opt.id}
              optionIndex={idx}
              optionText={opt.option_text}
              isSelected={isSelected}
              isDisabled={isSubmitting}
              isSubmitted={isSubmitted}
              isCorrect={isCorrect}
              isAuthoritativeSelected={isAuthoritativeSelected}
              onSelect={(id) => {
                if (!isSubmitted) {
                  setSelectedOptionId(id);
                  setSubmitError(null);
                }
              }}
            />
          );
        })}
      </div>

      {/* Submit Error Banner */}
      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Pre-Submission Action Button */}
      {!isSubmitted && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={!selectedOptionId || isSubmitting}
            className="w-full sm:w-auto min-w-[140px] gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memeriksa...</span>
              </>
            ) : (
              <span>Jawab</span>
            )}
          </Button>
        </div>
      )}

      {/* Post-Submission Feedback Panel */}
      {isSubmitted && feedbackState && (
        <FeedbackPanel
          isCorrect={feedbackState.is_correct}
          questionExplanation={feedbackState.question_explanation}
          selectedOptionExplanation={feedbackState.selected_option_explanation}
          correctOptionExplanation={feedbackState.correct_option_explanation}
          attemptId={feedbackState.attempt_id}
          presets={mistakePresets}
          onLogReason={handleLogMistakeReason}
          onNext={handleNextQuestion}
          isLastQuestion={isLastQuestion}
          isPendingNext={isSubmitting || isFinalizing}
        />
      )}
    </div>
  );
}
