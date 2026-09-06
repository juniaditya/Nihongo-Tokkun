import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { MistakeLogger, type MistakePreset } from './mistake-logger';

interface FeedbackPanelProps {
  isCorrect: boolean;
  questionExplanation?: string | null;
  selectedOptionExplanation?: string | null;
  correctOptionExplanation?: string | null;
  attemptId?: string;
  presets: MistakePreset[];
  onLogReason: (attemptId: string, reason: string, customReason?: string) => Promise<boolean>;
  onNext: () => void;
  isLastQuestion: boolean;
  isPendingNext: boolean;
}

export function FeedbackPanel({
  isCorrect,
  questionExplanation,
  selectedOptionExplanation,
  correctOptionExplanation,
  attemptId,
  presets,
  onLogReason,
  onNext,
  isLastQuestion,
  isPendingNext,
}: FeedbackPanelProps) {
  const hasExplanations =
    !!questionExplanation || !!selectedOptionExplanation || !!correctOptionExplanation;

  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 space-y-4 backdrop-blur-md shadow-glass-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
        isCorrect
          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
          : 'border-red-500/30 bg-red-950/20 text-red-100'
      }`}
    >
      {/* Status banner */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
              <XCircle className="h-6 w-6 stroke-[2.5]" />
            </div>
          )}

          <div>
            <h2 className="font-heading text-lg font-bold">
              {isCorrect ? 'Luar Biasa! Jawaban Benar' : 'Jawaban Kurang Tepat'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isCorrect
                ? 'Pertahankan pemahaman Anda!'
                : 'Perhatikan penjelasan di bawah untuk memahami konsepnya.'}
            </p>
          </div>
        </div>

        {/* Next Button on header for quick action */}
        <button
          type="button"
          onClick={onNext}
          disabled={isPendingNext}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-all ${
            isCorrect
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90'
              : 'bg-gradient-to-r from-primary-500 to-secondary-500 hover:opacity-90'
          }`}
        >
          {isPendingNext ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>{isLastQuestion ? 'Selesai & Lihat Hasil' : 'Lanjut'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Explanations section */}
      {hasExplanations && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2.5 text-xs md:text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-primary-400 uppercase tracking-wider text-[11px]">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Penjelasan & Pembahasan</span>
          </div>

          {questionExplanation && (
            <div className="text-foreground leading-relaxed">
              <p className="font-medium text-muted-foreground text-[11px] mb-0.5">Penjelasan Soal:</p>
              <p className="font-japanese text-sm">{questionExplanation}</p>
            </div>
          )}

          {correctOptionExplanation && (
            <div className="text-emerald-300/90 leading-relaxed border-t border-white/5 pt-2">
              <p className="font-medium text-emerald-400/80 text-[11px] mb-0.5">Penjelasan Opsi Benar:</p>
              <p className="font-japanese text-sm">{correctOptionExplanation}</p>
            </div>
          )}

          {selectedOptionExplanation && !isCorrect && (
            <div className="text-red-300/90 leading-relaxed border-t border-white/5 pt-2">
              <p className="font-medium text-red-400/80 text-[11px] mb-0.5">Catatan Pilihan Anda:</p>
              <p className="font-japanese text-sm">{selectedOptionExplanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Mistake Reason Logging for Incorrect Attempts */}
      {!isCorrect && attemptId && presets.length > 0 && (
        <MistakeLogger
          attemptId={attemptId}
          presets={presets}
          onLogReason={onLogReason}
        />
      )}
    </div>
  );
}
