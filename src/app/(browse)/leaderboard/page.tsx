import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';
import { LeaderboardList, type LeaderboardEntry } from '@/components/learning/leaderboard-list';
import type { Database } from '@/types/database.types';

export const metadata: Metadata = { title: 'Leaderboard | Nihongo Tokkun' };
type Stats = Pick<Database['public']['Views']['v_user_global_stats']['Row'], 'user_id' | 'username' | 'sessions_completed' | 'accuracy_percent'>;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const result = await supabase.from('v_user_global_stats')
    .select('user_id,username,sessions_completed,accuracy_percent')
    .gt('sessions_completed', 0)
    .order('sessions_completed', { ascending: false, nullsFirst: false })
    .order('accuracy_percent', { ascending: false, nullsFirst: false })
    .order('total_correct', { ascending: false, nullsFirst: false })
    .order('user_id', { ascending: true }).limit(20);
  if (result.error) console.error('[Leaderboard] load:', result.error.message);
  // Keep identifiers server-side: only public display data and a highlight flag reach the list.
  const entries: LeaderboardEntry[] = ((result.data ?? []) as Stats[]).map((row, index) => ({
    rank: index + 1, username: row.username,
    sessionsCompleted: row.sessions_completed ?? 0,
    accuracy: row.accuracy_percent ?? null,
    isCurrentUser: !!user && row.user_id === user.id,
  }));
  return <Container size="lg" className="py-8 space-y-6">
    <header className="space-y-2">
      <h1 className="font-heading text-3xl font-bold">Leaderboard</h1>
      <p className="text-muted-foreground">20 pelajar teratas berdasarkan jumlah latihan selesai.</p>
      <p className="text-xs text-muted-foreground">Jika jumlahnya sama, urutan mengikuti akurasi lalu jumlah jawaban benar.</p>
    </header>
    {result.error ? <div role="alert" className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3"><p>Peringkat belum dapat dimuat. Silakan coba lagi.</p><a className="text-primary-500 underline" href="/leaderboard">Muat Ulang</a></div> : <LeaderboardList entries={entries} />}
    <Link href={user ? '/courses' : '/login'} className="inline-flex rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{user ? 'Lanjut Belajar' : 'Masuk untuk Mulai Belajar'}</Link>
  </Container>;
}
