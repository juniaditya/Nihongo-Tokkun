export interface LeaderboardEntry {
  rank: number;
  username: string | null;
  sessionsCompleted: number;
  accuracy: number | null;
  isCurrentUser: boolean;
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-2">
      <p className="font-semibold">Belum ada peringkat.</p>
      <p className="text-sm text-muted-foreground">Selesaikan latihan pertamamu untuk mulai berpartisipasi.</p>
    </div>;
  }
  return <ol aria-label="Peringkat pelajar" className="space-y-3">
    {entries.map(entry => <li key={entry.rank} className={`flex items-start gap-3 sm:gap-5 rounded-2xl border p-4 sm:p-5 ${entry.isCurrentUser ? 'border-primary-500/60 bg-primary-500/10' : 'border-white/10 bg-white/5'}`}>
      <span aria-label={`Peringkat ${entry.rank}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 font-bold text-primary-500">{entry.rank}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{entry.username?.trim() || 'Pelajar'}</h2>
          {entry.isCurrentUser && <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-500">Anda</span>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <p><strong className="text-foreground">{entry.sessionsCompleted}</strong> latihan selesai</p>
          <p>Akurasi <strong className="text-foreground">{entry.accuracy === null ? '—' : `${entry.accuracy.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`}</strong></p>
        </div>
      </div>
    </li>)}
  </ol>;
}
