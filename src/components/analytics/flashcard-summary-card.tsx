import type { FlashcardSummary } from '@/lib/analytics';
import { Layers, ThumbsUp, RefreshCw } from 'lucide-react';

interface FlashcardSummaryCardProps {
  summary: FlashcardSummary;
}

export function FlashcardSummaryCard({ summary }: FlashcardSummaryCardProps) {
  if (summary.cardsReviewed === 0) return null;

  return (
    <section
      aria-labelledby="flashcard-summary-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        <h2
          id="flashcard-summary-heading"
          className="text-lg font-bold text-foreground"
        >
          Ringkasan Flashcard
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3.5 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Total Kartu</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            {summary.cardsReviewed}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center space-y-1">
          <p className="text-xs text-emerald-400 flex items-center justify-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            Good
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400">
            {summary.goodCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center space-y-1">
          <p className="text-xs text-amber-400 flex items-center justify-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Again
          </p>
          <p className="text-xl sm:text-2xl font-bold text-amber-400">
            {summary.againCount}
          </p>
        </div>
      </div>
    </section>
  );
}
