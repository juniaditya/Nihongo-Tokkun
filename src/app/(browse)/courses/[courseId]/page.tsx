import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { JLPTBadge } from '@/components/learning/jlpt-badge';
import { LessonTabs } from '@/components/learning/lesson-tabs';
import { ChevronRight } from 'lucide-react';
import type { Database } from '@/types/database.types';
import { readAll, type LessonStatus } from '@/lib/learning-progress';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type LessonCatalogRow = Database['public']['Views']['v_public_lesson_catalog']['Row'];

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('courses')
    .select('name, level')
    .eq('id', courseId)
    .maybeSingle();

  const course = data as Pick<CourseRow, 'name' | 'level'> | null;

  if (!course) {
    return { title: 'Kursus tidak ditemukan | Nihongo Tokkun' };
  }

  return {
    title: `${course.name} | Nihongo Tokkun`,
    description: `Jelajahi lesson ${course.level ?? ''} dalam kursus ${course.name}.`,
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Fetch course
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id, name, level, description')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    console.error('[CourseDetailPage] course error:', courseError.message);
  }

  if (!courseData) notFound();

  const course = courseData as Pick<CourseRow, 'id' | 'name' | 'level' | 'description'>;

  // Fetch lesson catalog via the safe public view
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('v_public_lesson_catalog')
    .select('id, course_id, category, number, title, is_guest_accessible, time_limit_seconds, sort_order')
    .eq('course_id', courseId)
    .order('number');

  if (lessonsError) {
    console.error('[CourseDetailPage] lessons error:', lessonsError.message);
  }

  const lessonList = (lessonsData ?? []) as LessonCatalogRow[];
  let statuses: Record<string, LessonStatus> | undefined;
  let progressError = false;
  if (user) {
    try {
      const progress = await readAll<{ lesson_id: string; status: LessonStatus }>((from, to) => supabase.from('lesson_progress').select('lesson_id,status').eq('user_id', user.id).order('lesson_id').range(from, to));
      statuses = Object.fromEntries(progress.map(row => [row.lesson_id, row.status]));
    } catch (error) {
      console.error('[CourseDetailPage] progress:', error);
      progressError = true;
    }
  }

  return (
    <Container size="xl" className="py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/courses" className="hover:text-foreground transition-colors">
          Kursus
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        <span className="text-foreground font-medium truncate">{course.name}</span>
      </nav>

      {/* Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            {course.level && <JLPTBadge level={course.level} size="lg" />}
            {course.name}
          </span>
        }
        description={course.description ?? undefined}
      />

      {/* Lesson count summary */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{lessonList.length}</span> lesson ditemukan
        {!isAuthenticated && lessonList.some((l) => !l.is_guest_accessible) && (
          <span className="ml-2 text-muted-foreground/60">
            · beberapa dikunci (login untuk akses penuh)
          </span>
        )}
      </p>

      {/* Category Tabs + Lesson List (Client Component) */}
      {progressError && <p role="alert" className="text-sm text-muted-foreground">Status belajarmu belum dapat dimuat. Silakan muat ulang halaman.</p>}
      {lessonList.length === 0 ? (
        <EmptyState
          icon={null}
          title="Belum ada lesson"
          description="Lesson untuk kursus ini belum tersedia."
        />
      ) : (
        <LessonTabs lessons={lessonList} isAuthenticated={isAuthenticated} statuses={statuses} />
      )}
    </Container>
  );
}
