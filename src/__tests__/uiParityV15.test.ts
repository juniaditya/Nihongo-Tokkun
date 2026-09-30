import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('v1.5.1 Japanese TTS behavior', () => {
  test('shared TTS control uses browser speech synthesis with ja-JP, mute, and voice selection', () => {
    const source = read('components/TtsButton.tsx');
    assert.match(source, /speechSynthesis/);
    assert.match(source, /SpeechSynthesisUtterance/);
    assert.match(source, /ja-JP/);
    assert.match(source, /nihongo-tokkun-tts-muted/);
    assert.match(source, /nihongo-tokkun-tts-voice/);
    assert.match(source, /Pilih suara TTS Jepang/);
    assert.match(source, /Mute/);
  });

  test('flashcard automatically speaks only when the back is shown', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.match(source, /autoPlay=\{flipped\}/);
    assert.match(source, /ttsBackPlaySeq/);
    assert.match(source, /autoPlayKey=\{flipped \? `\$\{card\.id\}:back:\$\{ttsBackPlaySeq\}` : null\}/);
    assert.match(source, /showSettings/);
  });

  test('quiz automatically speaks only after an answer and excludes Dokkai', () => {
    const source = read('features/quiz/QuizShell.tsx');
    assert.match(source, /session\.lesson\.category === 'dokkai'.*DokkaiSession/);
    assert.match(source, /quizTtsReady = selectedOption != null/);
    assert.match(source, /autoPlay=\{quizTtsReady\}/);
    assert.match(source, /disabled=\{!quizTtsReady\}/);
  });

  test('Dokkai passage has no TTS control', () => {
    const source = read('features/quiz/PassageDisplay.tsx');
    assert.doesNotMatch(source, /TtsButton/);
    assert.doesNotMatch(source, /Dengarkan bacaan/);
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
