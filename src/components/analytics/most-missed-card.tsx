import Link from 'next/link';
import type { MissedQuestionItem } from '@/lib/analytics';
import { HelpCircle, ArrowRight } from 'lucide-react';

interface MostMissedCardProps {
  items: MissedQuestionItem[];
}

export function MostMissedCard({ items }: MostMissedCardProps) {
  return (
    <section
      aria-labelledby="most-missed-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
          <h2 id="most-missed-heading" className="text-lg font-bold text-foreground">
            Soal Paling Sering Salah
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Top 10</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Belum ada soal yang sering salah.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const displayTitle = item.word || item.grammar || item.questionText;
            return (
              <div
                key={item.questionId}
                className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-4 space-y-3 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary-400">
                      {item.questionTypeTitle}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-xs font-bold text-rose-400">
                      {item.incorrectCount} kesalahan
                    </span>
                  </div>

                  <p className="font-japanese text-lg font-bold text-foreground break-words line-clamp-2">
                    {displayTitle}
                  </p>

                  {item.reading && item.reading !== displayTitle && (
                    <p className="text-xs text-muted-foreground">
                      読み: {item.reading}
                    </p>
                  )}

                  {item.latestReason && (
                    <p className="text-xs text-amber-400/90 italic line-clamp-1">
                      Alasan terakhir: {item.latestReason}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {item.lessonTitle}
                  </span>
                  <Link
                    href={`/lessons/${item.lessonId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    Buka Lesson
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
