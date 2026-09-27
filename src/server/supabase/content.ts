// SERVER-ONLY MODULE
import 'server-only';

import { getSupabaseClient } from './client';
import {
  CourseSummary,
  LessonSummary,
  LessonContent,
  Question,
  QuestionOption,
  Passage,
  Flashcard,
  SearchCard,
} from '@/lib/types';

// --- Courses -------------------------------------------------------

/**
 * Returns all courses with a lesson count per course.
 * Source: Supabase `lessons` table — no Spreadsheet read.
 *
 * Schema: lessons has NO source_id column.
 * Actual columns: id, course_id, category, lesson_number, label, created_at.
 */
export async function getAllCourses(): Promise<CourseSummary[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lessons')
    .select('id, label, category, lesson_number')
    .order('category')
    .order('lesson_number');

  if (error) throw new Error(`[getAllCourses] ${error.message}`);

  const map = new Map<string, CourseSummary>();
  for (const row of data ?? []) {
    const key = `${row.category}__${row.lesson_number}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        sourceId: row.id, // lessons has no source_id; use UUID
        label: row.label ?? `${row.category} ${row.lesson_number}`,
        category: row.category as CourseSummary['category'],
        dayNumber: row.lesson_number,
        lessonCount: 1,
      });
    } else {
      map.get(key)!.lessonCount++;
    }
  }

  return Array.from(map.values());
}

// --- Lessons -------------------------------------------------------

/**
 * Returns all lessons, optionally filtered by category.
 * Source: Supabase `lessons` table.
 *
 * Schema: no source_id on lessons; uses lesson_number (not day_number).
 */
export async function getLessons(
  category?: 'kotoba' | 'bunpou' | 'dokkai'
): Promise<LessonSummary[]> {
  const sb = getSupabaseClient();
  let query = sb
    .from('lessons')
    .select(`
      id,
      label,
      category,
      lesson_number,
      questions(count),
      flashcards(count),
      passages(count)
    `)
    .order('category')
    .order('lesson_number');

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw new Error(`[getLessons] ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    courseId: `${row.category}__${row.lesson_number}`,
    sourceId: row.id, // lessons has no source_id — use UUID as surrogate
    label: row.label ?? `${row.category} ${row.lesson_number}`,
    category: row.category as LessonSummary['category'],
    dayNumber: row.lesson_number,
    questionCount: (row.questions as unknown as { count: number }[])?.[0]?.count ?? 0,
    flashcardCount: (row.flashcards as unknown as { count: number }[])?.[0]?.count ?? 0,
    passageCount: (row.passages as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

/**
 * Returns one lesson by its UUID.
 */
export async function getLessonById(id: string): Promise<LessonSummary | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('lessons')
    .select(`
      id,
      label,
      category,
      lesson_number,
      questions(count),
      flashcards(count),
      passages(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`[getLessonById] ${error.message}`);
  }

  return {
    id: data.id,
    courseId: `${data.category}__${data.lesson_number}`,
    sourceId: data.id,
    label: data.label ?? `${data.category} ${data.lesson_number}`,
    category: data.category as LessonSummary['category'],
    dayNumber: data.lesson_number,
    questionCount: (data.questions as unknown as { count: number }[])?.[0]?.count ?? 0,
    flashcardCount: (data.flashcards as unknown as { count: number }[])?.[0]?.count ?? 0,
    passageCount: (data.passages as unknown as { count: number }[])?.[0]?.count ?? 0,
  };
}

// --- Full Lesson Content -------------------------------------------

/**
 * Fetches full lesson content: questions+options, passages, flashcards.
 * Source: Supabase only — no Spreadsheet fallback.
 */
export async function getLessonContent(lessonId: string): Promise<LessonContent | null> {
  const lesson = await getLessonById(lessonId);
  if (!lesson) return null;

  const [questions, passages, flashcards] = await Promise.all([
    getQuestionsForLesson(lessonId),
    getPassagesForLesson(lessonId),
    getFlashcardsForLesson(lessonId),
  ]);

  return { lesson, questions, passages, flashcards };
}

// --- Questions -----------------------------------------------------

/**
 * Schema: questions.prompt (not .text), ordered by section + question_index.
 * explanation lives on question_options rows, not on questions itself.
 */
async function getQuestionsForLesson(lessonId: string): Promise<Question[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('questions')
    .select(`
      id,
      lesson_id,
      source_id,
      prompt,
      section,
      question_index,
      question_options (
        id,
        question_id,
        text,
        is_correct,
        explanation,
        option_index
      )
    `)
    .eq('lesson_id', lessonId)
    .order('section')
    .order('question_index');

  if (error) throw new Error(`[getQuestionsForLesson] ${error.message}`);

  return (data ?? []).map((q) => ({
    id: q.id,
    lessonId: q.lesson_id,
    sourceId: q.source_id,
    text: q.prompt,        // DB column is 'prompt'; UI contract exposes as 'text'
    explanation: null,     // no per-question explanation in this schema
    options: ((q.question_options as unknown[]) ?? [])
      .slice()
      .sort((a: unknown, b: unknown) => {
        const ao = a as { option_index: number };
        const bo = b as { option_index: number };
        return ao.option_index - bo.option_index;
      })
      .map((o: unknown) => {
        const opt = o as {
          id: string;
          question_id: string;
          text: string;
          is_correct: boolean;
          explanation: string | null;
          option_index: number;
        };
        return {
          id: opt.id,
          questionId: opt.question_id,
          text: opt.text,
          isCorrect: opt.is_correct,
          explanation: opt.explanation ?? null,
        } satisfies QuestionOption;
      }),
  }));
}

// --- Passages ------------------------------------------------------

/**
 * Schema: passages has text_a, text_b, passage_type, order_index.
 * Maps to UI Passage contract:
 *   sectionKey = passage_type ('single' | 'two')
 *   text       = text_a  (primary reading)
 *   title      = text_b  (secondary reading for tougou, or null)
 */
async function getPassagesForLesson(lessonId: string): Promise<Passage[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('passages')
    .select('id, lesson_id, source_id, passage_type, text_a, text_b, order_index')
    .eq('lesson_id', lessonId)
    .order('order_index');

  if (error) throw new Error(`[getPassagesForLesson] ${error.message}`);

  return (data ?? []).map((p) => ({
    id: p.id,
    lessonId: p.lesson_id,
    sourceId: p.source_id,
    sectionKey: p.passage_type,
    text: p.text_a,
    title: p.text_b ?? null,
  }));
}

// --- Flashcards ----------------------------------------------------

/**
 * Schema: flashcards.front and .back are JSONB objects.
 *   front: { depan: string }
 *   back (kotoba): { hiragana, arti, penjelasan }
 *   back (bunpou):  { fungsi, contohKalimat, rumus, arti, perbedaanKunci }
 *
 * Maps to UI Flashcard contract.
 */
async function getFlashcardsForLesson(lessonId: string): Promise<Flashcard[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('flashcards')
    .select('id, lesson_id, source_id, section, front, back')
    .eq('lesson_id', lessonId)
    .order('id');

  if (error) throw new Error(`[getFlashcardsForLesson] ${error.message}`);

  return (data ?? []).map((f) => {
    const frontObj = f.front as Record<string, string> | null;
    const backObj  = f.back  as Record<string, string> | null;

    const frontText = frontObj?.depan ?? JSON.stringify(frontObj ?? '');
    const reading   = backObj?.hiragana ?? null;
    const meaning   = backObj?.arti ?? backObj?.fungsi ?? JSON.stringify(backObj ?? '');
    const detail    = backObj?.penjelasan ?? backObj?.contohKalimat ?? null;

    return {
      id: f.id,
      lessonId: f.lesson_id,
      sourceId: f.source_id,
      section: f.section ?? undefined,
      front: frontText,
      reading,
      meaning,
      detailExplanation: detail,
      back: backObj ?? undefined,
    } satisfies Flashcard;
  });
}


// --- Search ---------------------------------------------------------

/**
 * Search index for the Apps Script parity screen. 2511 cards is small enough
 * for the personal N2 app, and this query returns only compact card metadata.
 * The browser filters this list instantly without another round-trip.
 */
export async function getSearchCards(): Promise<SearchCard[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('flashcards')
    .select('source_id, section, front, back, lessons(category, lesson_number, label)')
    .in('section', ['latihan', 'flashcard'])
    .order('source_id');

  if (error) throw new Error(`[getSearchCards] ${error.message}`);

  return (data ?? []).flatMap((raw) => {
    const row = raw as unknown as {
      source_id: string;
      front: Record<string, string> | string | null;
      back: Record<string, string> | string | null;
      lessons?: { category?: string; lesson_number?: number; label?: string | null } | Array<{ category?: string; lesson_number?: number; label?: string | null }> | null;
    };
    const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
    if (!lesson || (lesson.category !== 'kotoba' && lesson.category !== 'bunpou')) return [];
    const frontObj = typeof row.front === 'object' && row.front ? row.front : {};
    const backObj = typeof row.back === 'object' && row.back ? row.back : {};
    const front = typeof row.front === 'string' ? row.front : frontObj.depan ?? '';
    const fields = lesson.category === 'kotoba'
      ? [
          { label: 'Cara Baca', value: backObj.hiragana ?? '' },
          { label: 'Arti', value: backObj.arti ?? '' },
          { label: 'Penjelasan', value: backObj.penjelasan ?? '' },
        ]
      : [
          { label: 'Bahasa Indonesia', value: backObj.arti ?? '' },
          { label: 'Fungsi', value: backObj.fungsi ?? '' },
          { label: 'Perbedaan Kunci', value: backObj.perbedaanKunci ?? '' },
          { label: 'Rumus', value: backObj.rumus ?? '' },
          { label: 'Contoh Kalimat', value: backObj.contohKalimat ?? '' },
        ];
    return [{
      cardId: row.source_id,
      category: lesson.category,
      lessonNumber: Number(lesson.lesson_number) || 0,
      lessonLabel: lesson.label ?? `${lesson.category} ${lesson.lesson_number}`,
      front,
      fields,
    } satisfies SearchCard];
  });
}
