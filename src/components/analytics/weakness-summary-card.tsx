import { getWeaknessColor, type WeaknessItem } from '@/lib/analytics';
import { Target } from 'lucide-react';

interface WeaknessSummaryCardProps {
  items: WeaknessItem[];
}

export function WeaknessSummaryCard({ items }: WeaknessSummaryCardProps) {
  return (
    <section
      aria-labelledby="weakness-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-400" aria-hidden="true" />
          <h2 id="weakness-heading" className="text-lg font-bold text-foreground">
            Kelemahan Saya
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Urut paling lemah</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Belum ada data kelemahan. Selesaikan sesi latihan untuk melihat performa per tipe soal.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const colors = getWeaknessColor(item.weaknessLabel);
            return (
              <div
                key={item.questionType}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 p-3 sm:p-4 hover:border-white/10 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-sm sm:text-base">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.lessonCount} materi · {item.attemptsCount} kali latihan
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {item.avgScore}%
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shrink-0 ${colors.badge}`}
                  >
                    {item.weaknessLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
