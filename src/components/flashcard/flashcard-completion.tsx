'use client';

import React from 'react';
import Link from 'next/link';
import { Trophy, RotateCcw, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LessonCategory } from '@/types';

interface FlashcardCompletionProps {
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string | null;
  category: LessonCategory;
  totalCards: number;
  goodCount: number;
  againCount: number;
  onRestart: () => void;
}

export function FlashcardCompletion({
  lessonId,
  lessonNumber,
  lessonTitle,
  category,
  totalCards,
  goodCount,
  againCount,
  onRestart,
}: FlashcardCompletionProps) {
  const accuracyPercent = totalCards > 0 ? Math.round((goodCount / totalCards) * 100) : 0;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 py-6 animate-in fade-in-50 zoom-in-95 duration-300">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-400 shadow-2xl shadow-amber-500/10">
          <Trophy className="h-10 w-10 animate-bounce" />
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Flashcard Selesai! 🎉
          </h1>
          <p className="text-sm text-muted-foreground">
            Kamu telah menyelesaikan <span className="font-semibold text-foreground">{totalCards} kartu</span> pada Unit {lessonNumber} {lessonTitle ? `(${lessonTitle})` : ''}.
          </p>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-md">
        {/* Total Cards */}
        <div className="text-center space-y-1 border-r border-white/10 pr-2">
          <span className="text-[11px] uppercase font-semibold text-muted-foreground">Total Kartu</span>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{totalCards}</p>
          <span className="text-[11px] text-muted-foreground">Dipelajari</span>
        </div>

        {/* Good Count */}
        <div className="text-center space-y-1 border-r border-white/10 px-2">
          <span className="text-[11px] uppercase font-semibold text-emerald-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Good
          </span>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-emerald-300">{goodCount}</p>
          <span className="text-[11px] text-emerald-400/80 font-mono">{accuracyPercent}%</span>
        </div>

        {/* Again Count */}
        <div className="text-center space-y-1 pl-2">
          <span className="text-[11px] uppercase font-semibold text-rose-400 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Again
          </span>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-rose-300">{againCount}</p>
          <span className="text-[11px] text-rose-400/80 font-mono">
            {totalCards > 0 ? Math.round((againCount / totalCards) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        {/* Restart Session */}
        <button
          type="button"
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Ulangi Sesi Flashcard</span>
        </button>

        {/* Back to Unit */}
        <Link
          href={`/lessons/${lessonId}`}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/10 hover:border-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Halaman Unit</span>
        </Link>
      </div>
    </div>
  );
}
