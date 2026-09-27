import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import the pure sort utility (no server-only, no Supabase dependency)
import type { LessonSummary } from '../lib/types.ts';
import { sortLessons, CATEGORY_RANK } from '../lib/lessonSort.ts';

function makeLesson(
  category: LessonSummary['category'],
  dayNumber: number,
  id = `${category}-${dayNumber}`
): LessonSummary {
  return {
    id,
    courseId: `${category}__${dayNumber}`,
    sourceId: id,
    label: `${category} ${dayNumber}`,
    category,
    dayNumber,
    questionCount: 1,
    flashcardCount: 0,
    passageCount: 0,
  };
}

describe('CATEGORY_RANK', () => {
  test('kotoba < bunpou < dokkai', () => {
    assert.ok(CATEGORY_RANK.kotoba < CATEGORY_RANK.bunpou);
    assert.ok(CATEGORY_RANK.bunpou < CATEGORY_RANK.dokkai);
  });
});

describe('sortLessons', () => {
  test('empty input returns empty array', () => {
    assert.deepEqual(sortLessons([]), []);
  });

  test('kotoba comes before bunpou before dokkai regardless of DB order', () => {
    const input = [
      makeLesson('dokkai', 1),
      makeLesson('bunpou', 1),
      makeLesson('kotoba', 1),
    ];
    const sorted = sortLessons(input);
    assert.equal(sorted[0].category, 'kotoba');
    assert.equal(sorted[1].category, 'bunpou');
    assert.equal(sorted[2].category, 'dokkai');
  });

  test('within same category, lesson_number is ascending', () => {
    const input = [
      makeLesson('kotoba', 5),
      makeLesson('kotoba', 1),
      makeLesson('kotoba', 62),
      makeLesson('kotoba', 10),
    ];
    const sorted = sortLessons(input);
    assert.deepEqual(
      sorted.map((l) => l.dayNumber),
      [1, 5, 10, 62]
    );
  });

  test('full N2 distribution: 62 kotoba, 1 bunpou, 12 dokkai', () => {
    const lessons: LessonSummary[] = [
      ...Array.from({ length: 62 }, (_, i) => makeLesson('kotoba', i + 1)),
      makeLesson('bunpou', 1),
      ...Array.from({ length: 12 }, (_, i) => makeLesson('dokkai', i + 1)),
    ];
    // Shuffle to simulate arbitrary DB order
    const shuffled = [...lessons].sort(() => Math.random() - 0.5);

    const sorted = sortLessons(shuffled);

    // Never infer category from array index — verify by .category field
    const kotoba = sorted.filter((l) => l.category === 'kotoba');
    const bunpou  = sorted.filter((l) => l.category === 'bunpou');
    const dokkai  = sorted.filter((l) => l.category === 'dokkai');

    assert.equal(kotoba.length, 62);
    assert.equal(bunpou.length, 1);
    assert.equal(dokkai.length, 12);

    // All kotoba come before any bunpou
    const lastKotobaIdx = sorted.findLastIndex((l) => l.category === 'kotoba');
    const firstBunpouIdx = sorted.findIndex((l) => l.category === 'bunpou');
    assert.ok(lastKotobaIdx < firstBunpouIdx, 'all kotoba before bunpou');

    // All bunpou come before any dokkai
    const lastBunpouIdx = sorted.findLastIndex((l) => l.category === 'bunpou');
    const firstDokkaiIdx = sorted.findIndex((l) => l.category === 'dokkai');
    assert.ok(lastBunpouIdx < firstDokkaiIdx, 'all bunpou before dokkai');

    // Kotoba lesson_number order
    assert.deepEqual(
      kotoba.map((l) => l.dayNumber),
      Array.from({ length: 62 }, (_, i) => i + 1)
    );

    // Dokkai lesson_number order
    assert.deepEqual(
      dokkai.map((l) => l.dayNumber),
      Array.from({ length: 12 }, (_, i) => i + 1)
    );
  });

  test('does not mutate the original array', () => {
    const input = [makeLesson('dokkai', 3), makeLesson('kotoba', 1)];
    const original = [...input];
    sortLessons(input);
    assert.deepEqual(input, original);
  });
});
