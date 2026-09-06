import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';

export const metadata: Metadata = {
  title: 'Dashboard | Nihongo Tokkun',
  description: 'Ringkasan progres belajar bahasa Jepang Anda.',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username = 'Pengguna';
  if (user) {
    const profileResult = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    const profile = profileResult.data as { username: string } | null;

    if (profile?.username) {
      username = profile.username;
    } else if (user.user_metadata?.username) {
      username = user.user_metadata.username as string;
    } else if (user.email) {
      username = user.email.split('@')[0];
    }
  }

  return (
    <Container size="xl" className="py-8 space-y-12">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Konnichiwa,{' '}
          <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {username}
          </span>
          ! 👋
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl">
          Siap melanjutkan latihan JLPT Anda hari ini? Mari kita selesaikan target harian!
        </p>
      </header>

      {/* 
        NOTE FOR STEP 7:
        This is a UI placeholder. Real dashboard data fetching (progress, streaks, etc)
        is explicitly removed as per the Step 7 App Shell + Design System requirements.
      */}
      <section className="space-y-6">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
          Statistik Placeholder (UI Only)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/4 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Streak Latihan</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">hari</span></p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/4 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Waktu Belajar</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">jam</span></p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/4 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Akurasi Rata-rata</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">0%</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/4 p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Sesi Selesai</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">0</p>
          </div>
        </div>
      </section>
    </Container>
  );
}
