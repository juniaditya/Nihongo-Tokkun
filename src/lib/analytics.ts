import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import { questionTypeLabel } from '@/lib/learning-progress';

type CourseRow = Pick<Database['public']['Tables']['courses']['Row'], 'id' | 'name' | 'level'>;
type LessonRow = Pick<Database['public']['Views']['v_public_lesson_catalog']['Row'], 'id' | 'course_id' | 'category' | 'number' | 'title'>;
type TypeProgressRow = Pick<Database['public']['Tables']['lesson_type_progress']['Row'], 'lesson_id' | 'question_type' | 'best_score' | 'attempts_count'>;
type MistakeLogRow = Pick<Database['public']['Tables']['mistake_logs']['Row'], 'attempt_id' | 'reason' | 'created_at'>;
type AttemptRow = Pick<Database['public']['Tables']['question_attempts']['Row'], 'id' | 'question_id' | 'answered_at' | 'session_id'>;
type ReviewRow = Pick<Database['public']['Tables']['flashcard_reviews']['Row'], 'flashcard_id' | 'rating'>;
type QuestionRow = Pick<Database['public']['Views']['v_practice_questions']['Row'], 'id' | 'lesson_id' | 'question_type' | 'question_text'>;
type KotobaRow = Pick<Database['public']['Tables']['kotoba']['Row'], 'lesson_id' | 'word' | 'reading' | 'meaning'>;
type BunpouRow = Pick<Database['public']['Tables']['bunpou']['Row'], 'lesson_id' | 'grammar' | 'meaning'>;

export type WeaknessLabel = 'Sangat Baik' | 'Baik' | 'Perlu Latihan' | 'Lemah';

export function getWeaknessLabel(score: number): WeaknessLabel {
  if (score >= 90) return 'Sangat Baik';
  if (score >= 75) return 'Baik';
  if (score >= 60) return 'Perlu Latihan';
  return 'Lemah';
}

export function getWeaknessColor(label: WeaknessLabel): {
  badge: string;
  bar: string;
  text: string;
} {
  switch (label) {
    case 'Sangat Baik':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        bar: 'bg-emerald-500',
        text: 'text-emerald-400',
      };
    case 'Baik':
      return {
        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        bar: 'bg-sky-500',
        text: 'text-sky-400',
      };
    case 'Perlu Latihan':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        bar: 'bg-amber-500',
        text: 'text-amber-400',
      };
    case 'Lemah':
      return {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        bar: 'bg-rose-500',
        text: 'text-rose-400',
      };
  }
}

export interface WeaknessItem {
  questionType: string;
  label: string;
  avgScore: number;
  attemptsCount: number;
  lessonCount: number;
  weaknessLabel: WeaknessLabel;
}

export interface MistakeReasonItem {
  reason: string;
  count: number;
}

export interface MissedQuestionItem {
  questionId: string;
  lessonId: string;
  lessonTitle: string;
  lessonCategory: string;
  lessonNumber: number;
  questionType: string;
  questionTypeTitle: string;
  questionText: string;
  word?: string | null;
  reading?: string | null;
  grammar?: string | null;
  incorrectCount: number;
  latestReason?: string | null;
}

export interface FlashcardSummary {
  cardsReviewed: number;
  againCount: number;
  goodCount: number;
}

export interface LearnerAnalytics {
  courses: Array<{ id: string; name: string; level: string | null }>;
  selectedCourseId: string | null;
  weaknessSummary: WeaknessItem[];
  topMistakeReasons: MistakeReasonItem[];
  mostMissedItems: MissedQuestionItem[];
  nextFocus: WeaknessItem | null;
  itemsToReview: MissedQuestionItem[];
  flashcardSummary: FlashcardSummary;
  hasData: boolean;
}

export async function loadLearnerAnalytics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  courseId?: string | null
): Promise<LearnerAnalytics> {
  const selectedCourseId = courseId || null;

  // Run all primary queries scoped to the user in parallel
  const [
    coursesRes,
    lessonsRes,
    typeProgressRes,
    mistakesRes,
    attemptsRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from('courses').select('id, name, level').order('level'),
    supabase
      .from('v_public_lesson_catalog')
      .select('id, course_id, category, number, title')
      .order('sort_order'),
    supabase
      .from('lesson_type_progress')
      .select('lesson_id, question_type, best_score, attempts_count')
      .eq('user_id', userId),
    supabase
      .from('mistake_logs')
      .select('attempt_id, reason, created_at')
      .eq('user_id', userId)
      .not('reason', 'is', null),
    supabase
      .from('question_attempts')
      .select('id, question_id, answered_at, session_id')
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('answered_at', { ascending: false }),
    supabase
      .from('flashcard_reviews')
      .select('flashcard_id, rating')
      .eq('user_id', userId),
  ]);

  const courses = (coursesRes.data ?? []) as CourseRow[];
  const allLessons = (lessonsRes.data ?? []) as LessonRow[];
  const lessonMap = new Map(allLessons.map((l) => [l.id, l]));

  // Determine lesson set for filtering
  const targetLessonIds = new Set(
    selectedCourseId
      ? allLessons.filter((l) => l.course_id === selectedCourseId).map((l) => l.id)
      : allLessons.map((l) => l.id)
  );

  // 1. Weakness Summary
  const filteredTypeProgress = ((typeProgressRes.data ?? []) as TypeProgressRow[]).filter((tp) =>
    targetLessonIds.has(tp.lesson_id)
  );

  const typeGroups: Record<
    string,
    { totalScore: number; count: number; attempts: number }
  > = {};

  for (const row of filteredTypeProgress) {
    if (row.best_score == null) continue;
    if (!typeGroups[row.question_type]) {
      typeGroups[row.question_type] = { totalScore: 0, count: 0, attempts: 0 };
    }
    typeGroups[row.question_type].totalScore += Number(row.best_score);
    typeGroups[row.question_type].count += 1;
    typeGroups[row.question_type].attempts += row.attempts_count ?? 1;
  }

  const weaknessSummary: WeaknessItem[] = Object.entries(typeGroups)
    .map(([qType, data]) => {
      const avgScore = Math.round(data.totalScore / data.count);
      return {
        questionType: qType,
        label: questionTypeLabel(qType),
        avgScore,
        attemptsCount: data.attempts,
        lessonCount: data.count,
        weaknessLabel: getWeaknessLabel(avgScore),
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore); // Weakest first

  // 2. Mistake reasons
  const attemptsList = (attemptsRes.data ?? []) as AttemptRow[];
  const mistakeList = (mistakesRes.data ?? []) as MistakeLogRow[];
  const attemptMap = new Map(attemptsList.map((a) => [a.id, a]));
  const mistakeCounts: Record<string, number> = {};

  for (const m of mistakeList) {
    const r = m.reason?.trim();
    if (!r) continue;
    // If course filter active, ensure attempt belongs to this course
    if (selectedCourseId) {
      const att = attemptMap.get(m.attempt_id);
      if (!att) continue;
    }
    mistakeCounts[r] = (mistakeCounts[r] || 0) + 1;
  }

  const topMistakeReasons: MistakeReasonItem[] = Object.entries(mistakeCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Most-Missed Items (Top 10 questions answered incorrectly)
  const missedByQuestion: Record<
    string,
    { count: number; latestAttemptId: string; latestAnsweredAt: string }
  > = {};

  for (const att of attemptsList) {
    if (!missedByQuestion[att.question_id]) {
      missedByQuestion[att.question_id] = {
        count: 0,
        latestAttemptId: att.id,
        latestAnsweredAt: att.answered_at,
      };
    }
    missedByQuestion[att.question_id].count += 1;
  }

  // Get top 10 question IDs
  const sortedQuestionEntries = Object.entries(missedByQuestion)
    .sort(
      (a, b) =>
        b[1].count - a[1].count ||
        b[1].latestAnsweredAt.localeCompare(a[1].latestAnsweredAt)
    )
    .slice(0, 10);

  const topQIds = sortedQuestionEntries.map(([qId]) => qId);

  // Fetch question metadata and associated kotoba/bunpou if questions exist
  let mostMissedItems: MissedQuestionItem[] = [];

  if (topQIds.length > 0) {
    const { data: vpqData } = await supabase
      .from('v_practice_questions')
      .select('id, lesson_id, question_type, question_text')
      .in('id', topQIds);

    const vpqList = (vpqData ?? []) as QuestionRow[];
    const questionsList = vpqList.filter((q) =>
      targetLessonIds.has(q.lesson_id)
    );
    const relatedLessonIds = [...new Set(questionsList.map((q) => q.lesson_id))];

    // Fetch Kotoba and Bunpou for these lessons to extract word/reading
    const [kotobaRes, bunpouRes] = await Promise.all([
      relatedLessonIds.length > 0
        ? supabase
            .from('kotoba')
            .select('lesson_id, word, reading, meaning')
            .in('lesson_id', relatedLessonIds)
        : Promise.resolve({ data: [] }),
      relatedLessonIds.length > 0
        ? supabase
            .from('bunpou')
            .select('lesson_id, grammar, meaning')
            .in('lesson_id', relatedLessonIds)
        : Promise.resolve({ data: [] }),
    ]);

    const kotobaList = (kotobaRes.data ?? []) as KotobaRow[];
    const bunpouList = (bunpouRes.data ?? []) as BunpouRow[];

    // Map attempt mistake reasons
    const mistakeByAttempt = new Map(
      mistakeList.map((m) => [m.attempt_id, m.reason])
    );

    mostMissedItems = questionsList
      .map((q) => {
        const stats = missedByQuestion[q.id];
        const lesson = lessonMap.get(q.lesson_id);
        const latestReason = stats ? mistakeByAttempt.get(stats.latestAttemptId) : null;

        // Associate word / grammar:
        let word: string | null = null;
        let reading: string | null = null;
        let grammar: string | null = null;

        if (lesson?.category === 'kotoba') {
          // Check if question_text is itself a word in kotoba
          const matchedKotoba =
            kotobaList.find(
              (k) => k.lesson_id === q.lesson_id && k.word === q.question_text
            ) ||
            kotobaList.find(
              (k) =>
                k.lesson_id === q.lesson_id &&
                q.question_text.includes(k.word)
            ) ||
            kotobaList.find((k) => k.lesson_id === q.lesson_id);

          if (matchedKotoba) {
            word = matchedKotoba.word;
            reading = matchedKotoba.reading;
          } else {
            word = q.question_text;
          }
        } else if (lesson?.category === 'bunpou') {
          const matchedBunpou =
            bunpouList.find(
              (b) => b.lesson_id === q.lesson_id && q.question_text.includes(b.grammar)
            ) || bunpouList.find((b) => b.lesson_id === q.lesson_id);

          if (matchedBunpou) {
            grammar = matchedBunpou.grammar;
          }
        }

        return {
          questionId: q.id,
          lessonId: q.lesson_id,
          lessonTitle: lesson?.title ?? `${lesson?.category ?? 'Lesson'} ${lesson?.number ?? ''}`,
          lessonCategory: lesson?.category ?? 'kotoba',
          lessonNumber: lesson?.number ?? 1,
          questionType: q.question_type,
          questionTypeTitle: questionTypeLabel(q.question_type),
          questionText: q.question_text,
          word,
          reading,
          grammar,
          incorrectCount: stats?.count ?? 1,
          latestReason,
        };
      })
      .sort((a, b) => b.incorrectCount - a.incorrectCount);
  }

  // 4. Flashcard Summary
  const reviews = (reviewsRes.data ?? []) as ReviewRow[];
  const uniqueCards = new Set(reviews.map((r) => r.flashcard_id)).size;
  const againCount = reviews.filter((r) => r.rating?.toLowerCase() === 'again').length;
  const goodCount = reviews.filter((r) => r.rating?.toLowerCase() === 'good').length;

  const flashcardSummary: FlashcardSummary = {
    cardsReviewed: uniqueCards,
    againCount,
    goodCount,
  };

  // 5. Review recommendations (Perlu Diulang)
  // Next focus: the single weakest question type
  const nextFocus = weaknessSummary.length > 0 ? weaknessSummary[0] : null;
  // Items to review: top 3 to 5 most-missed items
  const itemsToReview = mostMissedItems.slice(0, 5);

  const hasData =
    weaknessSummary.length > 0 ||
    topMistakeReasons.length > 0 ||
    mostMissedItems.length > 0 ||
    flashcardSummary.cardsReviewed > 0;

  return {
    courses,
    selectedCourseId,
    weaknessSummary,
    topMistakeReasons,
    mostMissedItems,
    nextFocus,
    itemsToReview,
    flashcardSummary,
    hasData,
  };
}
