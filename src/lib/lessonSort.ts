import type { LessonSummary } from './types';

/**
 * Deterministic category display order.
 * Never infer category from array position — always use lesson.category.
 *
 * Order: Kotoba (1) → Bunpou (2) → Dokkai (3), then lesson_number ASC.
 */
export const CATEGORY_RANK: Record<LessonSummary['category'], number> = {
  kotoba: 1,
  bunpou: 2,
  dokkai: 3,
};

/**
 * Sort lessons into a stable, deterministic display order.
 * Does NOT rely on PostgreSQL row-order or array index position.
 */
export function sortLessons(lessons: LessonSummary[]): LessonSummary[] {
  return [...lessons].sort((a, b) => {
    const rankDiff = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
    if (rankDiff !== 0) return rankDiff;
    return a.dayNumber - b.dayNumber;
  });
}
