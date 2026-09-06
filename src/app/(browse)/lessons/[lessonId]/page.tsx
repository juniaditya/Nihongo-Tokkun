import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/ui/page-header';
import { JLPTBadge } from '@/components/learning/jlpt-badge';
import {
  Lock,
  ChevronRight,
  BookOpen,
  Clock,
  Layers,
  BookText,
  FileText,
  PlayCircle,
  Construction,
} from 'lucide-react';
import type { Database } from '@/types/database.types';

type LessonCatalogRow = Database['public']['Views']['v_public_lesson_catalog']['Row'];
type CourseRow = Database['public']['Tables']['courses']['Row'];

interface LessonPageProps {
  params: Promise<{ lessonId: string }>;
}

const CATEGORY_CONFIG: Record<
  LessonCatalogRow['category'],
  { label: string; labelJa: string; icon: React.ElementType; color: string }
> = {
  kotoba: { label: 'Kotoba', labelJa: '語彙', icon: BookText, color: 'text-indigo-400' },
  bunpou: { label: 'Bunpou', labelJa: '文法', icon: BookOpen, color: 'text-emerald-400' },
  dokkai: { label: 'Dokkai', labelJa: '読解', icon: FileText, color: 'text-amber-400' },
};

function questionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    meaning: '意味 · Arti',
    reading: '読み方 · Bacaan',
    usage: '用法 · Penggunaan',
    context: '文脈 · Konteks',
    synonym: '類義語 · Sinonim',
    grammar_choice: '文法選択 · Pilihan Grammar',
    fill_in: '穴埋め · Isi Kosong',
    ordering: '並べ替え · Urutan',
    comprehension: '読解 · Pemahaman',
  };
  return labels[type] ?? type;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('v_public_lesson_catalog')
    .select('category, number, title')
    .eq('id', lessonId)
    .maybeSingle();

  const lesson = data as Pick<LessonCatalogRow, 'category' | 'number' | 'title'> | null;
  if (!lesson) return { title: 'Lesson tidak ditemukan | Nihongo Tokkun' };

  const catConfig = CATEGORY_CONFIG[lesson.category];
  const lessonName = lesson.title ?? `${catConfig.label} ${lesson.number}`;
  return {
    title: `${lessonName} | Nihongo Tokkun`,
    description: `Overview lesson ${lessonName}.`,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // 1. Fetch lesson catalog metadata
  const { data: catalogData, error: catalogError } = await supabase
    .from('v_public_lesson_catalog')
    .select('id, course_id, category, number, title, is_guest_accessible, time_limit_seconds')
    .eq('id', lessonId)
    .maybeSingle();

  if (catalogError) {
    console.error('[LessonPage] catalog error:', catalogError.message);
  }

  if (!catalogData) notFound();

  const catalogLesson = catalogData as LessonCatalogRow;

  // 2. Fetch parent course
  const { data: courseData } = await supabase
    .from('courses')
    .select('id, name, level')
    .eq('id', catalogLesson.course_id)
    .maybeSingle();

  const course = courseData as Pick<CourseRow, 'id' | 'name' | 'level'> | null;

  const catConfig = CATEGORY_CONFIG[catalogLesson.category];
  const CategoryIcon = catConfig.icon;
  const lessonName = catalogLesson.title ?? `${catConfig.label} ${catalogLesson.number}`;
  const isAccessible = isAuthenticated || catalogLesson.is_guest_accessible;

  // 3. Fetch content data only if accessible
  let questionTypes: string[] = [];
  let hasFlashcards = false;

  if (isAccessible) {
    // Fetch all question_type values and deduplicate in TypeScript via safe practice view
    const { data: questionRows } = await supabase
      .from('v_practice_questions')
      .select('question_type')
      .eq('lesson_id', lessonId);

    if (questionRows) {
      const rawRows = questionRows as { question_type: string }[];
      questionTypes = [...new Set(rawRows.map((q) => q.question_type))];
    }

    // Flashcard availability — only for kotoba and bunpou (not dokkai per PRD)
    if (catalogLesson.category !== 'dokkai') {
      const { count } = await supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', lessonId)
        .eq('is_active', true);

      hasFlashcards = (count ?? 0) > 0;
    }
  }

  return (
    <Container size="lg" className="py-8 space-y-8">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap"
        aria-label="Breadcrumb"
      >
        <Link href="/courses" className="hover:text-foreground transition-colors">
          Kursus
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" />
        {course && (
          <>
            <Link
              href={`/courses/${course.id}`}
              className="hover:text-foreground transition-colors"
            >
              {course.name}
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </>
        )}
        <span className="text-foreground font-medium truncate">{lessonName}</span>
      </nav>

      {/* Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            {course?.level && <JLPTBadge level={course.level} size="md" />}
            <span className={`inline-flex items-center gap-2 ${catConfig.color}`}>
              <CategoryIcon className="h-6 w-6" />
              <span className="font-japanese text-sm text-muted-foreground">
                {catConfig.labelJa}
              </span>
            </span>
            <span className="text-foreground">{lessonName}</span>
          </span>
        }
      />

      {/* Timer badge */}
      {catalogLesson.time_limit_seconds && isAccessible && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          Batas waktu: {Math.round(catalogLesson.time_limit_seconds / 60)} menit per sesi
        </div>
      )}

      {/* ─── LOCKED STATE ─── */}
      {!isAccessible && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/4 p-10 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-bold text-foreground">Lesson Terkunci</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Lesson ini tersedia setelah masuk atau mendaftar. Daftarkan akun gratis untuk
              membuka semua {course?.name ?? 'kursus'}.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-glow hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Daftar Gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      )}

      {/* ─── ACCESSIBLE CONTENT ─── */}
      {isAccessible && (
        <div className="space-y-6">
          {/* Practice Types */}
          <section aria-labelledby="practice-heading">
            <h2
              id="practice-heading"
              className="font-heading text-lg font-bold text-foreground mb-3"
            >
              Tipe Latihan
            </h2>

            {questionTypes.length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-white/4 p-6 text-sm text-muted-foreground text-center">
                Belum ada soal untuk lesson ini.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {questionTypes.map((type) => (
                  <div
                    key={type}
                    className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-4"
                    title="Latihan akan diaktifkan pada tahap berikutnya"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/15">
                      <PlayCircle className="h-5 w-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {questionTypeLabel(type)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Construction className="h-3 w-3" />
                        Latihan akan diaktifkan pada tahap berikutnya
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Flashcard — kotoba & bunpou only */}
          {catalogLesson.category !== 'dokkai' && (
            <section aria-labelledby="flashcard-heading">
              <h2
                id="flashcard-heading"
                className="font-heading text-lg font-bold text-foreground mb-3"
              >
                Flashcard
              </h2>

              {hasFlashcards ? (
                <div
                  className="flex items-center gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"
                  title="Flashcard akan diaktifkan pada tahap berikutnya"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
                    <Layers className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Flashcard tersedia</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Construction className="h-3 w-3" />
                      Sesi flashcard akan diaktifkan pada tahap berikutnya
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/4 p-4 text-sm text-muted-foreground">
                  Tidak ada flashcard untuk lesson ini.
                </div>
              )}
            </section>
          )}

          {/* Dokkai note */}
          {catalogLesson.category === 'dokkai' && (
            <section aria-labelledby="dokkai-heading">
              <h2
                id="dokkai-heading"
                className="font-heading text-lg font-bold text-foreground mb-3"
              >
                Teks Bacaan
              </h2>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-amber-300 font-medium mb-1">
                  Lesson berbasis teks bacaan
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Construction className="h-3 w-3" />
                  Passage reader akan diaktifkan pada tahap berikutnya
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
