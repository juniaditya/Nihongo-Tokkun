import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadDashboard } from '@/lib/dashboard';
import { questionTypeLabel } from '@/lib/learning-progress';
import { Container } from '@/components/layout/container';
import { ProgressBar } from '@/components/ui/progress-bar';
import { LessonStatusBadge } from '@/components/learning/lesson-status';

export const metadata: Metadata = { title: 'Dashboard | Nihongo Tokkun' };
const panel = 'rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6';
const linkStyle = 'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 hover:opacity-90';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const profile = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (profile.error) console.error('[Dashboard] profile:', profile.error.message);
  const username = (profile.data as { username: string | null } | null)?.username || (typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : 'Pelajar');
  let data: Awaited<ReturnType<typeof loadDashboard>>;
  try {
    data = await loadDashboard(supabase, user.id);
  } catch (error) {
    console.error('[Dashboard] load:', error);
    return <Container className="py-8"><h1 className="text-2xl font-bold">Dashboard</h1><div role="alert" className={`${panel} mt-6 space-y-4`}><p>Progress belum dapat dimuat. Silakan coba lagi.</p><Link href="/dashboard" className={linkStyle}>Muat Ulang</Link></div></Container>;
  }
  const stats = [
    ['Lesson selesai', data.completedLessons], ['Lesson sedang dipelajari', data.inProgressLessons],
    ['Total latihan selesai', data.completedSessions], ['Akurasi latihan', data.accuracy === null ? '—' : `${data.accuracy}%`],
  ];
  return <Container size="xl" className="py-8 space-y-8">
    <header className="space-y-2">
      <p className="text-sm font-semibold text-primary-500">Dashboard</p>
      <h1 className="font-heading text-2xl sm:text-3xl font-bold break-words">Selamat datang kembali, {username}</h1>
      <p className="text-muted-foreground">Lihat perkembanganmu dan lanjutkan belajar bahasa Jepang.</p>
    </header>
    <section aria-label="Ringkasan progress" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value]) => <div className={panel} key={label}><h2 className="text-sm text-muted-foreground">{label}</h2><p className="mt-3 text-3xl font-bold">{value}</p></div>)}
    </section>
    <p className="text-xs text-muted-foreground">Akurasi dihitung dari jawaban benar dibanding seluruh soal pada latihan selesai.</p>
    <section aria-labelledby="continue-heading" className={`${panel} border-primary-500/30 space-y-4`}>
      <h2 id="continue-heading" className="text-xl font-bold">Lanjut Belajar</h2>
      {data.continueLesson ? <>
        <p className="font-medium">{data.continueLesson.title ?? `Unit ${data.continueLesson.number}`}</p>
        <LessonStatusBadge status={data.status.get(data.continueLesson.id)} />
        {data.completedSessions === 0 && data.inProgressLessons === 0 && <p className="text-sm text-muted-foreground">Mulai lesson pertamamu. Setiap latihan adalah langkah maju.</p>}
        <div><Link className={linkStyle} href={`/lessons/${data.continueLesson.id}`}>Lanjut Belajar</Link></div>
      </> : <p className="text-muted-foreground">Belum ada lesson tersedia.</p>}
    </section>
    <section aria-labelledby="courses-heading" className="space-y-4">
      <h2 id="courses-heading" className="text-xl font-bold">Progress Kursus</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.courses.map(course => {
          const lessons = data.lessons.filter(lesson => lesson.course_id === course.id);
          const count = lessons.filter(lesson => data.status.get(lesson.id) === 'completed').length;
          const percentage = lessons.length ? Math.round(count / lessons.length * 100) : 0;
          return <Link key={course.id} href={`/courses/${course.id}`} className={`${panel} block space-y-3 hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}>
            <h3 className="font-bold">{course.level ? `JLPT ${course.level}` : course.name}</h3>
            <p className="text-sm text-muted-foreground">{count} / {lessons.length} lesson selesai · {percentage}%</p>
            <ProgressBar value={percentage} aria-label={`Progress ${course.name}`} />
          </Link>;
        })}
      </div>
      {data.courses.length === 0 && <p className="text-muted-foreground">Belum ada kursus tersedia.</p>}
    </section>
    <section aria-labelledby="activity-heading" className="space-y-4">
      <h2 id="activity-heading" className="text-xl font-bold">Aktivitas Terbaru</h2>
      {data.activity.length === 0 ? <div className={panel}><p>Belum ada latihan.</p><p className="mt-1 text-sm text-muted-foreground">Mulai lesson pertamamu melalui tombol Lanjut Belajar.</p></div> :
        <ul className={`${panel} divide-y divide-white/10`}>
          {data.activity.map(session => {
            const lesson = data.lessons.find(row => row.id === session.lesson_id);
            const date = session.completed_at ?? session.started_at;
            return <li key={session.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
              {lesson ? <Link className="font-medium hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" href={`/lessons/${lesson.id}`}>{lesson.title ?? `Unit ${lesson.number}`}</Link> : <p className="font-medium">Lesson tidak tersedia</p>}
              <p className="text-sm text-muted-foreground">{session.section ? questionTypeLabel(session.section) : 'Latihan'} · {session.completed_at ? 'Latihan selesai' : 'Latihan dimulai'}</p>
              <time dateTime={date} className="block text-xs text-muted-foreground">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(date))} WITA</time>
            </li>;
          })}
        </ul>}
    </section>
  </Container>;
}
