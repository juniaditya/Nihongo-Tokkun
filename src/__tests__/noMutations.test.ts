import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

function readSrc(relPath: string): string {
  return readFileSync(join(root, 'src', relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// No database mutations in quiz server module
// ---------------------------------------------------------------------------
describe('no database mutations in quiz.ts', () => {
  const quizSrc = readSrc('server/supabase/quiz.ts');

  test('no INSERT calls', () => {
    assert.doesNotMatch(quizSrc, /\.insert\s*\(/i);
  });

  test('no UPDATE calls', () => {
    assert.doesNotMatch(quizSrc, /\.update\s*\(/i);
  });

  test('no DELETE calls', () => {
    assert.doesNotMatch(quizSrc, /\.delete\s*\(/i);
  });

  test('no upsert calls', () => {
    assert.doesNotMatch(quizSrc, /\.upsert\s*\(/i);
  });

  test('no rpc mutation calls', () => {
    // rpc calls that could be mutations
    assert.doesNotMatch(quizSrc, /\.rpc\s*\(\s*['"](?:insert|update|delete|upsert)/i);
  });

  test('has server-only import', () => {
    assert.match(quizSrc, /import 'server-only'/);
  });
});

// ---------------------------------------------------------------------------
// No spreadsheet runtime references in quiz feature
// ---------------------------------------------------------------------------
describe('no spreadsheet runtime in quiz feature', () => {
  const quizShellSrc = readSrc('features/quiz/QuizShell.tsx');
  const quizServerSrc = readSrc('server/supabase/quiz.ts');

  const noSheetPatterns = [
    /SpreadsheetApp/,
    /sheets\.googleapis\.com/,
    /google\.script\.run/,
    /googleapis\.com\/spreadsheets/,
    /script\.google\.com/,
    /getSpreadsheet/,
  ];

  for (const pattern of noSheetPatterns) {
    test(`no ${pattern.source} in QuizShell`, () => {
      assert.doesNotMatch(quizShellSrc, pattern);
    });
    test(`no ${pattern.source} in quiz.ts`, () => {
      assert.doesNotMatch(quizServerSrc, pattern);
    });
  }
});

// ---------------------------------------------------------------------------
// Quiz result persists through the server-validated API
// ---------------------------------------------------------------------------
describe('quiz result persistence state', () => {
  const resultSrc = readSrc('features/quiz/QuizResult.tsx');
  const shellSrc = readSrc('features/quiz/QuizShell.tsx');

  test('QuizResult exposes Supabase save state instead of a local-only disclaimer', () => {
    assert.match(resultSrc, /saveState|Progress tersimpan|Supabase/i);
    assert.doesNotMatch(resultSrc, /tidak disimpan ke database|local-only/i);
  });

  test('QuizShell submits final attempt to the server API', () => {
    assert.match(shellSrc, /fetch\(['"]\/api\/quiz-attempt['"]/);
  });
});

// ---------------------------------------------------------------------------
// Client component boundaries
// ---------------------------------------------------------------------------
describe('client/server separation', () => {
  const quizServerSrc = readSrc('server/supabase/quiz.ts');
  const quizShellSrc = readSrc('features/quiz/QuizShell.tsx');

  test('quiz.ts is server-only (has server-only import)', () => {
    assert.match(quizServerSrc, /import 'server-only'/);
  });

  test('QuizShell.tsx is a client component (use client directive)', () => {
    assert.match(quizShellSrc, /^["']use client["']/m);
  });

  test('QuizShell does not import server-only module', () => {
    assert.doesNotMatch(quizShellSrc, /server-only/);
  });

  test('QuizShell does not import from server/supabase', () => {
    assert.doesNotMatch(quizShellSrc, /server\/supabase/);
  });
});
