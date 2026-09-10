import { getContentAccess, accessMessage } from '@/lib/content-access';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { JLPTBadge } from '@/components/learning/jlpt-badge';
import { BookText, FileText } from 'lucide-react';
import type { Database } from '@/types/database.types';

export const metadata: Metadata = {
  title: 'Kursus | Nihongo Tokkun',
  description: 'Pilih kursus JLPT dan mulai perjalanan belajar bahasa Jepang Anda.',
};

type CourseRow = Database['public']['Tables']['courses']['Row'];
type LessonCatalogRow = Database['public']['Views']['v_public_lesson_catalog']['Row'];

const CATEGORY_CONFIG: Record<
  LessonCatalogRow['category'],
  { label: string; labelJa: string; icon: React.ElementType; color: string }
> = {
  kotoba: { label: 'Kotoba', labelJa: '語彙', icon: BookText, color: 'text-indigo-400' },
  bunpou: { label: 'Bunpou', labelJa: '文法', icon: BookOpen, color: 'text-emerald-400' },
  dokkai: { label: 'Dokkai', labelJa: '読解', icon: FileText, color: 'text-amber-400' },
};

export default async function CoursesPage() {
  const supabase = await createClient();

  // courses has NO is_active column — fetch all
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, level, description')
    .order('level');

  if (coursesError) {
    console.error('[CoursesPage] courses error:', coursesError.message);
  }

  // Lesson catalog for category + count summaries
  const { data: catalogData } = await supabase
    .from('v_public_lesson_catalog')
    .select('course_id, category');

  const catalog = (catalogData ?? []) as Pick<LessonCatalogRow, 'course_id' | 'category'>[];
  const courses = (coursesData ?? []) as Pick<CourseRow, 'id' | 'name' | 'level' | 'description'>[];

  const accessByCourse = Object.fromEntries(await Promise.all(courses.map(async course => [course.id, await getContentAccess(course.id)] as const)));

  // Build per-course category sets and lesson counts
  const categoriesByCourse: Record<string, Set<LessonCatalogRow['category']>> = {};
  const lessonCountByCourse: Record<string, number> = {};

  for (const row of catalog) {
    if (!categoriesByCourse[row.course_id]) {
      categoriesByCourse[row.course_id] = new Set();
    }
    categoriesByCourse[row.course_id].add(row.category);
    lessonCountByCourse[row.course_id] = (lessonCountByCourse[row.course_id] ?? 0) + 1;
  }

  return (
    <Container size="xl" className="py-8 space-y-8">
      <PageHeader
        title="Pilih Kursus"
        description="Pilih kursus JLPT yang ingin Anda pelajari dan mulai latihan."
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="Belum ada kursus tersedia"
          description="Kursus akan segera ditambahkan. Coba lagi nanti."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const categories = categoriesByCourse[course.id]
              ? [...categoriesByCourse[course.id]]
              : ([] as LessonCatalogRow['category'][]);
            const lessonCount = lessonCountByCourse[course.id] ?? 0;

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/4 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:bg-white/8 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <div className="mb-4 flex items-start justify-between">
                  {course.level ? (
                    <JLPTBadge level={course.level} size="lg" variant="solid" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary-400" />
                </div>

                <h2 className="font-heading text-xl font-bold text-foreground mb-1">
                  {course.name}
                </h2>

                {course.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}

                {!accessByCourse[course.id].allowed && <div className="mb-4 space-y-1"><p className="text-sm font-semibold text-amber-400">Terkunci</p><p className="text-sm text-muted-foreground">{accessMessage(accessByCourse[course.id])}</p></div>}
                <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{lessonCount}</span> lesson tersedia
                  </p>

                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const config = CATEGORY_CONFIG[cat];
                        const Icon = config.icon;
                        return (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            <Icon className={`h-3 w-3 ${config.color}`} />
                            <span className="font-japanese">{config.labelJa}</span>
                            <span>{config.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Belum ada lesson</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
