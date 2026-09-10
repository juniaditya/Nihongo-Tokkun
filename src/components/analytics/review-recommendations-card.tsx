import Link from 'next/link';
import type { MissedQuestionItem, WeaknessItem } from '@/lib/analytics';
import { RotateCcw, ArrowRight, Sparkles } from 'lucide-react';

interface ReviewRecommendationsCardProps {
  nextFocus: WeaknessItem | null;
  itemsToReview: MissedQuestionItem[];
}

export function ReviewRecommendationsCard({
  nextFocus,
  itemsToReview,
}: ReviewRecommendationsCardProps) {
  if (!nextFocus && itemsToReview.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="review-recommendations-heading"
      className="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-center gap-2">
        <RotateCcw className="h-5 w-5 text-primary-400" aria-hidden="true" />
        <h2
          id="review-recommendations-heading"
          className="text-lg font-bold text-foreground"
        >
          Perlu Diulang
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Fokus Berikutnya */}
        {nextFocus && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-primary-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Fokus Berikutnya
            </p>
            <p className="text-xl font-bold text-foreground">{nextFocus.label}</p>
            <p className="text-xs text-muted-foreground">
              Rata-rata akurasi: {nextFocus.avgScore}% ({nextFocus.weaknessLabel})
            </p>
          </div>
        )}

        {/* Kotoba / Soal yang perlu diulang */}
        {itemsToReview.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 sm:col-span-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Materi yang perlu diulang:
            </p>
            <div className="flex flex-wrap gap-2">
              {itemsToReview.map((item) => {
                const label = item.word || item.grammar || item.questionText;
                return (
                  <Link
                    key={item.questionId}
                    href={`/lessons/${item.lessonId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary-500/20 hover:border-primary-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <span className="font-japanese font-semibold">{label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
