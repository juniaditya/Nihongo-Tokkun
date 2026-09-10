import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadDashboard } from '@/lib/dashboard';
import { loadLearnerAnalytics } from '@/lib/analytics';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/ui/page-header';
import { CourseFilter } from '@/components/analytics/course-filter';
import { WeaknessSummaryCard } from '@/components/analytics/weakness-summary-card';
import { MistakeReasonsCard } from '@/components/analytics/mistake-reasons-card';
import { MostMissedCard } from '@/components/analytics/most-missed-card';
import { ReviewRecommendationsCard } from '@/components/analytics/review-recommendations-card';
import { FlashcardSummaryCard } from '@/components/analytics/flashcard-summary-card';
import { LessonStatusBadge } from '@/components/learning/lesson-status';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Progress & Analisis Kelemahan | Nihongo Tokkun',
  description: 'Analisis kelemahan belajar, alasan kesalahan, dan materi yang perlu diulang.',
};

interface ProgressPageProps {
  searchParams: Promise<{ course?: string }>;
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const { course: courseParam } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login');

  try {
    const [dashboardData, analyticsData] = await Promise.all([
      loadDashboard(db, user.id),
      loadLearnerAnalytics(db, user.id, courseParam),
    ]);

    // Filter courses displayed in lesson catalog if a course filter is active
    const displayedCourses = analyticsData.selectedCourseId
      ? dashboardData.courses.filter((c) => c.id === analyticsData.selectedCourseId)
      : dashboardData.courses;

    return (
      <Container size="lg" className="py-8 space-y-8">
        <div className="space-y-4">
          <PageHeader
            title="Progress & Analisis Belajar"
            description="Pantau performa, temukan kelemahan, dan ketahui materi yang perlu diulang."
          />

          {/* Course filter */}
          <CourseFilter
            courses={analyticsData.courses}
            selectedCourseId={analyticsData.selectedCourseId}
          />
        </div>

        {/* Global empty state if brand new learner */}
        {!analyticsData.hasData && dashboardData.completedSessions === 0 ? (
          <section
            aria-label="Status kosong"
            className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center space-y-4"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-400">
              <BookOpen className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">
                Belum ada data kelemahan
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Selesaikan latihan untuk melihat analisis belajar, alasan kesalahan, dan materi yang perlu kamu ulangi.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/courses"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Mulai Belajar Sekarang
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* 1. What to review: rule-based next focus and missed items */}
            <ReviewRecommendationsCard
              nextFocus={analyticsData.nextFocus}
              itemsToReview={analyticsData.itemsToReview}
            />

            {/* 2. Weakness breakdown & Mistake reasons */}
            <div className="grid gap-6 lg:grid-cols-2">
              <WeaknessSummaryCard items={analyticsData.weaknessSummary} />
              <MistakeReasonsCard items={analyticsData.topMistakeReasons} />
            </div>

            {/* 3. Most-missed questions / items */}
            <MostMissedCard items={analyticsData.mostMissedItems} />

            {/* 4. Minimal Flashcard summary */}
            <FlashcardSummaryCard summary={analyticsData.flashcardSummary} />
          </>
        )}

        {/* 5. Course & Lesson Progress Overview */}
        <section aria-labelledby="lesson-progress-heading" className="space-y-6 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <h2 id="lesson-progress-heading" className="text-xl font-bold text-foreground">
              Status Materi Belajar
            </h2>
            <p className="text-sm text-muted-foreground">
              {dashboardData.completedLessons} lesson selesai · {dashboardData.completedSessions} latihan selesai.
            </p>
          </div>

          <div className="space-y-6">
            {displayedCourses.map((course) => {
              const courseLessons = dashboardData.lessons.filter(
                (l) => l.course_id === course.id
              );
              if (courseLessons.length === 0) return null;

              return (
                <div key={course.id} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {course.name}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {courseLessons.map((lesson) => {
                      const lessonStatus = dashboardData.status.get(lesson.id);
                      return (
                        <Link
                          key={lesson.id}
                          href={`/lessons/${lesson.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          <span className="font-medium text-foreground text-sm truncate">
                            {lesson.title ?? `${lesson.category} ${lesson.number}`}
                          </span>
                          <LessonStatusBadge status={lessonStatus} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </Container>
    );
  } catch (error) {
    console.error('[ProgressPage]', error);
    return (
      <Container size="lg" className="py-8">
        <p role="alert" className="text-rose-400">
          Progress belum dapat dimuat. Silakan muat ulang halaman.
        </p>
      </Container>
    );
  }
}
