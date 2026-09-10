import type { MistakeReasonItem } from '@/lib/analytics';
import { AlertCircle } from 'lucide-react';

interface MistakeReasonsCardProps {
  items: MistakeReasonItem[];
}

export function MistakeReasonsCard({ items }: MistakeReasonsCardProps) {
  return (
    <section
      aria-labelledby="mistake-reasons-heading"
      className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <h2 id="mistake-reasons-heading" className="text-lg font-bold text-foreground">
            Alasan Kesalahan Terbanyak
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">Top 5</span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Belum ada catatan kesalahan. Hebat! Pertahankan performa belajarmu.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item, idx) => (
            <li
              key={item.reason}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-foreground">
                  {idx + 1}
                </span>
                <span className="truncate text-foreground font-medium">
                  {item.reason}
                </span>
              </div>
              <span className="shrink-0 font-bold text-amber-400 text-sm">
                {item.count} <span className="text-xs font-normal text-muted-foreground">kali</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
