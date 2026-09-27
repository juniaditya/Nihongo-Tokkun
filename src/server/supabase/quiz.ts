// SERVER-ONLY MODULE — never imported by client components
import 'server-only';

import { getSupabaseClient } from './client';
import type { QuizSessionData, QuizQuestion, QuizOption, QuizPassage } from '@/lib/quizTypes';


function shuffleOptions<T>(items: T[]): T[] {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// Read adapter only. Final quiz persistence is handled by /api/quiz-attempt.
// No Spreadsheet reads.
// ============================================================

/**
 * Fetches all data needed to run a quiz session for a given lesson.
 *
 * @param lessonId - UUID of the lesson
 * @param section  - optional section filter (e.g. 'arti', 'tanbun')
 *                   if null/undefined, all sections are included
 * @returns QuizSessionData or null if lesson not found
 */
export async function getQuizSession(
  lessonId: string,
  section?: string | null,
  mode?: 'mixed' | null,
): Promise<QuizSessionData | null> {
  const sb = getSupabaseClient();

  // 1. Fetch lesson metadata
  const { data: lessonRow, error: lessonErr } = await sb
    .from('lessons')
    .select('id, category, lesson_number, label')
    .eq('id', lessonId)
    .single();

  if (lessonErr) {
    if (lessonErr.code === 'PGRST116') return null; // not found
    throw new Error(`[getQuizSession:lesson] ${lessonErr.message}`);
  }

  // 2. Fetch questions with options
  //    DB columns: id, lesson_id, source_id, prompt, section, question_index, passage_id
  //    Options: id, question_id, option_index, text, is_correct, explanation
  let questionQuery = sb
    .from('questions')
    .select(`
      id,
      source_id,
      prompt,
      section,
      question_index,
      passage_id,
      question_options (
        id,
        question_id,
        option_index,
        text,
        is_correct,
        explanation
      )
    `)
    .eq('lesson_id', lessonId)
    .order('section')
    .order('question_index');

  if (section) {
    questionQuery = questionQuery.eq('section', section);
  }

  const { data: rawQuestionRows, error: questionsErr } = await questionQuery;
  if (questionsErr) throw new Error(`[getQuizSession:questions] ${questionsErr.message}`);

  let questionRows = rawQuestionRows ?? [];
  if (mode === 'mixed') {
    if (lessonRow.category !== 'kotoba') {
      throw new Error('[getQuizSession] Mixed mode hanya tersedia untuk Kotoba.');
    }
    const mixedSections = ['penggunaan', 'yohou', 'ruigigo'];
    const selected: typeof questionRows = [];
    for (const mixedSection of mixedSections) {
      const candidates = questionRows.filter((q) => q.section === mixedSection);
      if (candidates.length < 10) {
        throw new Error(`[getQuizSession] Mixed membutuhkan minimal 10 soal untuk ${mixedSection}, tersedia ${candidates.length}.`);
      }
      // Fisher-Yates on a server-local copy. The original source_id remains unchanged.
      const shuffled = candidates.slice();
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      selected.push(...shuffled.slice(0, 10));
    }
    questionRows = selected;
  }

  // 3. Derive available sections from ALL questions in lesson (not filtered)
  //    We always query full section list for the SectionPicker
  const { data: allSectionRows, error: secErr } = await sb
    .from('questions')
    .select('section')
    .eq('lesson_id', lessonId)
    .order('section');

  if (secErr) throw new Error(`[getQuizSession:sections] ${secErr.message}`);

  const availableSections = [
    ...new Set((allSectionRows ?? []).map((r) => r.section as string)),
  ];

  // 4. Collect passage IDs referenced by questions
  const passageIds = [
    ...new Set(
      (questionRows ?? [])
        .map((q) => q.passage_id as string | null)
        .filter((id): id is string => id != null)
    ),
  ];

  // 5. Fetch passages if needed (Dokkai lessons)
  const passageMap: Record<string, QuizPassage> = {};
  if (passageIds.length > 0) {
    const { data: passageRows, error: passageErr } = await sb
      .from('passages')
      .select('id, source_id, passage_type, text_a, text_b')
      .in('id', passageIds);

    if (passageErr) throw new Error(`[getQuizSession:passages] ${passageErr.message}`);

    for (const p of passageRows ?? []) {
      passageMap[p.source_id as string] = {
        id: p.id as string,
        sourceId: p.source_id as string,
        passageType: p.passage_type as 'single' | 'two',
        textA: p.text_a as string,
        textB: (p.text_b as string | null) ?? null,
      };
    }
  }

  // 6. Build a passage lookup by passage UUID (for question → passage linkage)
  //    We need to map question.passage_id (UUID) → QuizPassage
  //    passages are keyed by source_id in passageMap, but questions have passage_id (UUID)
  //    Build a UUID→QuizPassage map too
  const passageById: Record<string, QuizPassage> = {};
  for (const p of Object.values(passageMap)) {
    passageById[p.id] = p;
  }

  // 7. Build QuizQuestion array
  const questions: QuizQuestion[] = (questionRows ?? []).map((q) => {
    const opts = ((q.question_options as unknown[]) ?? [])
      .slice()
      .sort((a: unknown, b: unknown) => {
        return (
          (a as { option_index: number }).option_index -
          (b as { option_index: number }).option_index
        );
      })
      .map((o: unknown): QuizOption => {
        const opt = o as {
          id: string;
          question_id: string;
          option_index: number;
          text: string;
          is_correct: boolean;
          explanation: string | null;
        };
        return {
          id: opt.id,
          optionIndex: opt.option_index,
          text: opt.text,
          isCorrect: opt.is_correct,
          explanation: opt.explanation ?? null,
        };
      });

    // Find the passage source_id for this question (via passage UUID lookup)
    const passageUuid = q.passage_id as string | null;
    const relatedPassage = passageUuid ? passageById[passageUuid] : null;

    return {
      id: q.id as string,
      sourceId: q.source_id as string,
      prompt: q.prompt as string,
      passageSourceId: relatedPassage?.sourceId ?? null,
      section: q.section as string,
      questionIndex: q.question_index as number,
      // Randomize only the display order. optionIndex/id keep their original
      // source identity, so scoring and persistence remain stable.
      options: shuffleOptions(opts),
    };
  });

  return {
    lesson: {
      id: lessonRow.id as string,
      category: lessonRow.category as QuizSessionData['lesson']['category'],
      lessonNumber: lessonRow.lesson_number as number,
      label: (lessonRow.label as string) ?? '',
    },
    section: mode === 'mixed' ? 'mixed' : section ?? null,
    mode: mode ?? null,
    availableSections,
    questions,
    passages: passageMap,
  };
}
