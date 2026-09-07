'use client';

import React from 'react';
import { RotateCcw, Check, Loader2, AlertCircle } from 'lucide-react';

interface FlashcardRatingBarProps {
  isSubmitting: boolean;
  onRate: (rating: 'again' | 'good') => void;
  lastError: string | null;
  onRetry: () => void;
}

export function FlashcardRatingBar({
  isSubmitting,
  onRate,
  lastError,
  onRetry,
}: FlashcardRatingBarProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      {/* Error alert with retry button if submission failed */}
      {lastError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{lastError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={isSubmitting}
            className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2-Scale Rating Buttons (Again / Good) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Again Button */}
        <button
          type="button"
          onClick={() => onRate('again')}
          disabled={isSubmitting}
          className="group relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 text-rose-300 transition-all hover:border-rose-500/60 hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-rose-500/5"
          aria-label="Rating Again — Belum Ingat"
        >
          <div className="flex items-center gap-2 font-heading font-bold text-base sm:text-lg text-rose-200">
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5 group-hover:-rotate-45 transition-transform" />
            )}
            <span>Again</span>
          </div>
          <span className="text-[11px] sm:text-xs text-rose-300/80">Belum Ingat / Sulit</span>
          <kbd className="hidden sm:inline-block mt-1 rounded bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono text-rose-300">
            1
          </kbd>
        </button>

        {/* Good Button */}
        <button
          type="button"
          onClick={() => onRate('good')}
          disabled={isSubmitting}
          className="group relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 text-emerald-300 transition-all hover:border-emerald-500/60 hover:bg-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-500/5"
          aria-label="Rating Good — Sudah Ingat"
        >
          <div className="flex items-center gap-2 font-heading font-bold text-base sm:text-lg text-emerald-200">
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5 group-hover:scale-110 transition-transform" />
            )}
            <span>Good</span>
          </div>
          <span className="text-[11px] sm:text-xs text-emerald-300/80">Sudah Ingat / Paham</span>
          <kbd className="hidden sm:inline-block mt-1 rounded bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
            2
          </kbd>
        </button>
      </div>
    </div>
  );
}
