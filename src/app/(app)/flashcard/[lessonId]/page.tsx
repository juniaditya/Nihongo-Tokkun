import { Container } from '@/components/layout/container';
import { getContentAccess } from '@/lib/content-access';
import { ContentLocked } from '@/components/learning/content-locked';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FlashcardSession } from '@/components/flashcard/flashcard-session';
import type { Course, PublicLessonCatalog, JLPTLevel, LessonCategory } from '@/types';
import type { FlashcardExtended } from '@/components/flashcard/flashcard-view';

interface FlashcardPageProps {
  params: Promise<{
    lessonId: string;
  }>;
}

export default async function FlashcardPage({ params }: FlashcardPageProps) {
  const { lessonId } = await params;
  const supabase = await createClient();

  // 1. Verify Authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/flashcard/${lessonId}`);
  }

  // 2. Fetch Lesson Metadata via safe public catalog view
  const { data: lessonData, error: lessonError } = await supabase
    .from('v_public_lesson_catalog')
    .select('id, course_id, category, number, title, is_guest_accessible, time_limit_seconds, sort_order')
    .eq('id', lessonId)
    .single();

  const lesson = lessonData as PublicLessonCatalog | null;

  if (lessonError || !lesson) {
    notFound();
  }

  const access = await getContentAccess(lesson.course_id, lessonId);
  if (!access.allowed) return <Container size="lg" className="py-8"><ContentLocked access={access} /></Container>;

  // Dokkai lessons have no flashcard per PRD
  if (lesson.category === 'dokkai') {
    redirect(`/lessons/${lessonId}`);
  }

  // Fetch Course level
  const { data: courseData } = await supabase
    .from('courses')
    .select('id, name, level, description, created_at, updated_at')
    .eq('id', lesson.course_id)
    .single();

  const course = courseData as Course | null;

  // 3. Fetch Flashcards with Kotoba & Bunpou joins
  const { data: rawFlashcards, error: fcError } = await supabase
    .from('flashcards')
    .select(`
      id,
      lesson_id,
      kotoba_id,
      bunpou_id,
      front,
      reading,
      meaning,
      explanation,
      legacy_id,
      sort_order,
      is_active,
      created_at,
      updated_at,
      kotoba:kotoba_id (
        id,
        word,
        reading,
        meaning,
        explanation,
        is_supplementary
      ),
      bunpou:bunpou_id (
        id,
        grammar,
        meaning
      )
    `)
    .eq('lesson_id', lessonId)
    .eq('is_active', true)
    .eq('is_supplementary', false)
    .order('sort_order', { ascending: true });

  if (fcError) {
    console.error('[FlashcardPage] Error fetching flashcards:', fcError);
    notFound();
  }

  // 4. Exclude Supplementary Kotoba Flashcards (PRD Section 9)
  const flashcards: FlashcardExtended[] = (rawFlashcards ?? []).filter(
    (fc: any) => !fc.kotoba || fc.kotoba.is_supplementary !== true
  );

  if (flashcards.length === 0) {
    return (
      <div className="container max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Tidak Ada Flashcard</h1>
        <p className="text-sm text-muted-foreground">
          Belum ada kartu flashcard aktif untuk Unit {lesson.number}.
        </p>
        <div className="pt-2">
          <a
            href={`/lessons/${lessonId}`}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Kembali ke Unit
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="container max-w-3xl mx-auto py-6 sm:py-10 px-4">
      <FlashcardSession
        lessonId={lesson.id}
        lessonNumber={lesson.number}
        lessonTitle={lesson.title}
        courseLevel={course?.level as JLPTLevel | null}
        category={lesson.category as LessonCategory}
        initialCards={flashcards}
      />
    </main>
  );
}
