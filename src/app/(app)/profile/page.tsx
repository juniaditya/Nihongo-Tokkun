import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/auth/actions';
import { Container } from '@/components/layout/container';
import type { Database } from '@/types/database.types';

export const metadata: Metadata = { title: 'Profil | Nihongo Tokkun' };
type Stats = Pick<Database['public']['Views']['v_user_global_stats']['Row'], 'sessions_completed' | 'accuracy_percent' | 'total_time_seconds'>;

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [profile, summary, completed] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    supabase.from('v_user_global_stats').select('sessions_completed,accuracy_percent,total_time_seconds').eq('user_id', user.id).maybeSingle(),
    supabase.from('lesson_progress').select('lesson_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
  ]);
  const username = (profile.data as { username: string | null } | null)?.username?.trim() || 'Pelajar';
  const stats = summary.data as Stats | null;
  const statsError = summary.error || completed.error;
  if (profile.error) console.error('[Profile] username:', profile.error.message);
  if (statsError) console.error('[Profile] stats:', statsError.message);
  const sessions = stats?.sessions_completed ?? 0;
  const seconds = stats?.total_time_seconds;
  const duration = seconds == null ? (stats ? '—' : '0 menit') : seconds < 60 && seconds > 0 ? 'Kurang dari 1 menit' : `${Math.floor(Math.max(0, seconds) / 60).toLocaleString('id-ID')} menit`;
  const cards = [
    ['Lesson selesai', completed.count ?? 0], ['Total latihan selesai', sessions],
    ['Akurasi latihan', sessions > 0 && stats?.accuracy_percent != null ? `${stats.accuracy_percent.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%` : '—'],
    ['Waktu latihan selesai', duration],
  ];
  return <Container size="lg" className="py-8 space-y-8">
    <header className="space-y-3">
      <p className="text-sm font-semibold text-primary-500">Profil</p>
      <h1 className="font-heading text-3xl font-bold break-words [overflow-wrap:anywhere]">{username}</h1>
      <p className="text-muted-foreground">Ringkasan perjalanan belajarmu.</p>
      {profile.error && <p role="alert" className="text-sm text-muted-foreground">Nama pengguna belum dapat dimuat.</p>}
    </header>
    {statsError ? <div role="alert" className="rounded-2xl border border-white/10 bg-white/5 p-6"><p>Statistik belum dapat dimuat. Silakan muat ulang halaman.</p></div> : <>
      <section aria-label="Statistik profil" className="grid gap-4 sm:grid-cols-2">
        {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"><h2 className="text-sm text-muted-foreground">{label}</h2><p className="mt-3 text-2xl font-bold">{value}</p></div>)}
      </section>
      {sessions === 0 && <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-5 space-y-2"><p className="font-semibold">Belum ada latihan selesai.</p><p className="text-sm text-muted-foreground">Mulai lesson pertamamu dan lihat progress di sini.</p></div>}
    </>}
    <div className="flex flex-col sm:flex-row gap-3">
      <Link href="/courses" className="inline-flex justify-center rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Lanjut Belajar</Link>
      <form action={logout}><button type="submit" className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Keluar dari Akun</button></form>
    </div>
  </Container>;
}
