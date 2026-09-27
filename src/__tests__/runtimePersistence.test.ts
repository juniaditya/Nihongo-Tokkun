import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('Next.js runtime remains Supabase-only', () => {
  const files = [
    'features/quiz/QuizShell.tsx',
    'features/flashcards/FlashcardShell.tsx',
    'app/api/quiz-attempt/route.ts',
    'app/api/flashcard-attempt/route.ts',
    'server/supabase/learning.ts',
    'server/supabase/flashcards.ts',
  ];

  for (const file of files) {
    test(`${file} contains no Apps Script / Spreadsheet runtime bridge`, () => {
      const source = read(file);
      assert.doesNotMatch(source, /SpreadsheetApp|google\.script\.run|sheets\.googleapis|script\.google\.com|getSpreadsheet/i);
    });
  }

  test('quiz persistence uses the atomic V3 RPC', () => {
    assert.match(read('app/api/quiz-attempt/route.ts'), /save_quiz_attempt_v3/);
  });

  test('kotoba flashcard persistence uses the atomic FSRS V3 RPC', () => {
    const source = read('app/api/flashcard-attempt/route.ts');
    assert.match(source, /save_flashcard_attempt_v3/);
    assert.match(source, /applyFsrsReview/);
  });

  test('flashcard client sends one final session payload', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.match(source, /\/api\/flashcard-attempt/);
    assert.match(source, /clientAttemptKey/);
  });
});

describe('course parity entry points', () => {
  const course = read('app/courses/CourseClientWrapper.tsx');
  test('course exposes real flashcard route', () => assert.match(course, /\/flashcards\//));
  test('course exposes Review Kotoba route', () => assert.match(course, /href="\/review"/));
  test('mixed Kotoba remains 10\/10\/10-compatible entry point', () => assert.match(course, /mode=mixed/));
});
