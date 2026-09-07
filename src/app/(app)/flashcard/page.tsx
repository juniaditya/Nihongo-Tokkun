import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Layers, ArrowRight } from 'lucide-react';
import { JLPTBadge } from '@/components/learning/jlpt-badge';
import { CategoryBadge } from '@/components/learning/category-badge';
import type { Course, PublicLessonCatalog, JLPTLevel, LessonCategory } from '@/types';

export default async function FlashcardHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/flashcard');
  }

  // Fetch all active courses
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, name, level, description, created_at, updated_at')
    .order('name');

  const courses = (coursesData ?? []) as Course[];

  // Fetch all active lessons with category kotoba or bunpou
  const { data: lessonsData } = await supabase
    .from('v_public_lesson_catalog')
    .select('id, course_id, category, number, title, is_guest_accessible, time_limit_seconds, sort_order')
    .in('category', ['kotoba', 'bunpou'])
    .order('sort_order', { ascending: true });

  const lessons = (lessonsData ?? []) as PublicLessonCatalog[];

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
          <Layers className="h-3.5 w-3.5" />
          <span>Flashcard SRS</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
          Pilih Unit Flashcard
        </h1>
        <p className="text-sm text-muted-foreground">
          Latih ingatan kosakata dan tata bahasa Jepang dengan sistem spaced repetition Anki.
        </p>
      </div>

      {/* Grouped by Courses */}
      <div className="space-y-6">
        {courses.map((course) => {
          const courseLessons = lessons.filter((l) => l.course_id === course.id);
          if (courseLessons.length === 0) return null;

          return (
            <section key={course.id} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                {course.level && <JLPTBadge level={course.level as JLPTLevel} size="md" />}
                <h2 className="font-heading text-lg font-bold text-foreground">
                  {course.name}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({courseLessons.length} unit flashcard)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {courseLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/flashcard/${lesson.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-indigo-500/5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <CategoryBadge category={lesson.category as LessonCategory} size="sm" />
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Unit {lesson.number}
                        </span>
                      </div>
                      <p className="font-heading text-sm font-semibold text-foreground group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {lesson.title || `Unit ${lesson.number}`}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-white/6 flex items-center justify-between text-xs text-indigo-400 font-medium">
                      <span>Mulai Flashcard</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
