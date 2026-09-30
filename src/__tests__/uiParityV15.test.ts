import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('v1.5 Japanese TTS', () => {
  test('shared TTS control uses browser speech synthesis with ja-JP', () => {
    const source = read('components/TtsButton.tsx');
    assert.match(source, /speechSynthesis/);
    assert.match(source, /SpeechSynthesisUtterance/);
    assert.match(source, /ja-JP/);
  });

  test('flashcards expose TTS without nesting it inside the card button', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.match(source, /<TtsButton/);
    assert.match(source, /flashcard-tts-row/);
  });

  test('quiz locks reading-question TTS until an answer is selected', () => {
    const source = read('features/quiz/QuizShell.tsx');
    assert.match(source, /currentQuestion\?\.section === 'cara_baca' && selectedOption == null/);
    assert.match(source, /disabled=\{questionTtsLocked\}/);
  });

  test('Dokkai passage has a listen control', () => {
    const source = read('features/quiz/PassageDisplay.tsx');
    assert.match(source, /Dengarkan bacaan/);
    assert.match(source, /<TtsButton/);
  });
});

describe('v1.5 Review Kotoba safe partial save', () => {
  test('review session intercepts unload and internal links when progress is unsaved', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.match(source, /beforeunload/);
    assert.match(source, /document\.addEventListener\('click', interceptNavigation, true\)/);
    assert.match(source, /hasUnsavedReviewProgress/);
  });

  test('review exit dialog saves reviewed cards before leaving', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.match(source, /const saved = await finish\(reviews\)/);
    assert.match(source, /window\.location\.assign\(pendingExitHref\)/);
    assert.match(source, /ReviewExitDialog/);
  });

  test('review exit dialog exposes cancel and save-and-exit actions', () => {
    const source = read('features/flashcards/ReviewExitDialog.tsx');
    assert.match(source, /Batal/);
    assert.match(source, /Simpan & Keluar/);
    assert.match(source, /reviewed/);
  });
});

describe('v1.5 centered flashcards', () => {
  test('flashcard shell opts into centered alignment class', () => {
    assert.match(read('features/flashcards/FlashcardShell.tsx'), /n2-flashcard-center/);
  });

  test('late CSS override centers card front and back fields', () => {
    const source = read('app/globals.css');
    assert.match(source, /\.flashcard-card\.n2-flashcard-center/);
    assert.match(source, /text-align: center/);
    assert.match(source, /\.fc-field-value/);
  });
});
