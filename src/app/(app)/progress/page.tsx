import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadDashboard } from '@/lib/dashboard';
import { Container } from '@/components/layout/container';
import { LessonStatusBadge } from '@/components/learning/lesson-status';

export const metadata = { title: 'Progress | Nihongo Tokkun' };
export default async function ProgressPage() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect('/login');
  try {
    const data = await loadDashboard(db,user.id);
    return <Container className="py-8 space-y-6">
      <h1 className="text-2xl font-bold">Progress Belajar</h1>
      <p className="text-muted-foreground">{data.completedLessons} lesson selesai · {data.completedSessions} latihan selesai. Buka lesson untuk melihat persentase setiap tipe belajar.</p>
      {data.courses.map(course=><section key={course.id} className="space-y-3">
        <h2 className="text-xl font-bold">{course.name}</h2>
        <div className="grid gap-3 sm:grid-cols-2">{data.lessons.filter(l=>l.course_id===course.id).map(lesson=><Link key={lesson.id} href={`/lessons/${lesson.id}`} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 focus-visible:ring-2 focus-visible:ring-primary-500">
          <h3 className="font-semibold">{lesson.title ?? `${lesson.category} ${lesson.number}`}</h3>
          <LessonStatusBadge status={data.status.get(lesson.id)} />
        </Link>)}</div>
      </section>)}
    </Container>;
  } catch(error) {
    console.error('[Progress]',error);
    return <Container className="py-8"><p role="alert">Progress belum dapat dimuat. Silakan muat ulang.</p></Container>;
  }
}
