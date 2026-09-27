import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('v1.3 quiz focus UI', () => {
  test('active question is rendered inside a dedicated quiz card', () => {
    assert.match(read('features/quiz/QuizShell.tsx'), /quiz-question-card/);
  });
  test('quiz options use theme-aware component classes', () => {
    const source = read('features/quiz/AnswerOption.tsx');
    assert.match(source, /quiz-answer-option/);
    assert.doesNotMatch(source, /bg-white\/\[0\.03\]/);
  });
});

describe('v1.3 course and lesson analytics', () => {
  test('mixed Kotoba is a flat action row with the 90 percent rule', () => {
    const source = read('app/courses/CourseClientWrapper.tsx');
    assert.match(source, /Latihan Campuran/);
    assert.match(source, /minimal 90%/);
    assert.doesNotMatch(source, /mixed-subrows/);
  });
  test('lesson detail replaces raw previews with progress and analysis', () => {
    const source = read('app/lessons/[id]/page.tsx');
    assert.match(source, /Progress per Latihan/);
    assert.match(source, /Mengapa Jawaban Salah/);
    assert.match(source, /Riwayat Latihan/);
    assert.doesNotMatch(source, /Preview Flashcard|Preview Soal/);
  });
  test('lesson analytics remains Supabase-only', () => {
    const source = read('server/supabase/lessonAnalysis.ts');
    assert.match(source, /\.from\('attempts'\)/);
    assert.match(source, /\.from\('answer_history'\)/);
    assert.doesNotMatch(source, /SpreadsheetApp|google\.script\.run|sheets\.googleapis|getSpreadsheet/i);
  });
});

describe('v1.3 navigation and dashboard polish', () => {
  test('navigation chrome has an opaque dedicated background token', () => {
    const source = read('app/globals.css');
    assert.match(source, /--chrome-bg:/);
    assert.match(source, /background: var\(--chrome-bg\)/);
  });
  test('dashboard metrics render as individual cards', () => {
    assert.match(read('features/dashboard/DashboardClient.tsx'), /dashboard-metric-card/);
  });
});
