import React from 'react';
import Link from 'next/link';
import { Trophy, XCircle, RotateCcw, ArrowLeft, CheckCircle, Target, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ProgressRing } from '@/components/ui/progress-ring';

interface ResultScreenProps {
  lessonId: string;
  lessonTitle: string;
  questionType: string;
  questionTypeLabel: string;
  category: 'kotoba' | 'bunpou' | 'dokkai';
  score: number;
  passingGradePercent: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ResultScreen({
  lessonId,
  lessonTitle,
  questionType,
  questionTypeLabel,
  category,
  score,
  passingGradePercent,
  passed,
  correctAnswers,
  totalQuestions,
  onRetry,
  isRetrying,
}: ResultScreenProps) {
  const roundedScore = Math.round(score);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 md:py-12 space-y-6 text-center animate-in fade-in zoom-in-95 duration-400">
      {/* Result Card */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-8 backdrop-blur-xl shadow-glass space-y-6 ${
          passed
            ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-card/80 to-card'
            : 'border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-card/80 to-card'
        }`}
      >
        {/* Glow ambient */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl pointer-events-none ${
            passed ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          }`}
        />

        {/* Icon & Status */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl border shadow-lg ${
              passed
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20'
                : 'border-rose-500/40 bg-rose-500/20 text-rose-400 shadow-rose-500/20'
            }`}
          >
            {passed ? (
              <Trophy className="h-10 w-10 stroke-[2.2]" />
            ) : (
              <Target className="h-10 w-10 stroke-[2.2]" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {lessonTitle} · {questionTypeLabel}
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              {passed ? 'Lulus Latihan!' : 'Belum Lulus'}
            </h2>
          </div>
        </div>

        {/* Score Ring / Gauge */}
        <div className="flex justify-center py-2">
          <ProgressRing
            value={roundedScore}
            size={140}
            strokeWidth={10}
            color={passed ? 'var(--color-kotoba, #6366f1)' : '#f43f5e'}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="font-heading text-3xl font-extrabold text-foreground">
                {roundedScore}%
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Target: {passingGradePercent}%
              </span>
            </div>
          </ProgressRing>
        </div>

        {/* Status Message */}
        <div
          className={`rounded-xl border p-4 text-xs md:text-sm leading-relaxed ${
            passed
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
          }`}
        >
          {passed ? (
            <p className="flex items-center justify-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                Selamat! Anda berhasil melampaui target kelulusan ({passingGradePercent}%).
              </span>
            </p>
          ) : (
            <div className="space-y-1 text-left">
              <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Nilai belum mencapai ambang kelulusan</span>
              </p>
              <p className="text-amber-300/80 text-xs">
                Salah satu tipe latihan belum mencapai nilai kelulusan ({passingGradePercent}%). Sesuai aturan latihan, progres kelulusan tipe pada lesson ini perlu diselesaikan kembali.
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">Jawaban Benar</p>
            <p className="text-base font-bold text-foreground mt-0.5">
              {correctAnswers} / {totalQuestions}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">Ambang Kelulusan</p>
            <p className="text-base font-bold text-foreground mt-0.5">
              {passingGradePercent}%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-90 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>Ulangi Latihan</span>
              </>
            )}
          </button>

          <Link
            href={`/lessons/${lessonId}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Lesson</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
