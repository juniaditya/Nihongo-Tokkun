import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, 'src', path), 'utf8');

describe('v1.6 TTS placement and replay', () => {
  test('flashcard TTS toolbar renders before the flashcard and every back flip increments autoplay key', () => {
    const source = read('features/flashcards/FlashcardShell.tsx');
    assert.ok(source.indexOf('flashcard-tts-toolbar') < source.indexOf('flashcard-card n2-flashcard-center'));
    assert.match(source, /setTtsBackPlaySeq\(\(value\) => value \+ 1\)/);
    assert.match(source, /`\$\{card\.id\}:back:\$\{ttsBackPlaySeq\}`/);
  });

  test('normal quiz TTS toolbar renders before the question container and still waits for an answer', () => {
    const source = read('features/quiz/QuizShell.tsx');
    assert.ok(source.indexOf('quiz-tts-toolbar') < source.indexOf('quiz-question-card'));
    assert.match(source, /const quizTtsReady = selectedOption != null/);
    assert.match(source, /disabled=\{!quizTtsReady\}/);
  });

  test('Dokkai is routed to a grouped component with no TTS', () => {
    const shell = read('features/quiz/QuizShell.tsx');
    const dokkai = read('features/quiz/DokkaiSession.tsx');
    assert.match(shell, /session\.lesson\.category === 'dokkai'/);
    assert.doesNotMatch(dokkai, /TtsButton/);
  });
});

describe('v1.6 answer explanations', () => {
  test('wrong answers show both why the correct option is correct and why the selected option is wrong', () => {
    const source = read('features/quiz/AnswerFeedback.tsx');
    assert.match(source, /Kenapa “\{correctOption\.text\}” benar/);
    assert.match(source, /Kenapa “\{selectedOption\.text\}” salah/);
    assert.match(source, /correctOption\?\.explanation/);
    assert.match(source, /selectedOption\.explanation/);
  });

  test('Dokkai grouped review also exposes correct and wrong option explanations', () => {
    const source = read('features/quiz/DokkaiSession.tsx');
    assert.match(source, /correctOption\?\.explanation/);
    assert.match(source, /chosen\.explanation/);
    assert.match(source, /Kenapa “\{correctOption\.text\}” benar/);
    assert.match(source, /Kenapa “\{chosen\.text\}” salah/);
  });
});

describe('v1.6 personal Kotoba and Bunpou', () => {
  test('material form is collapsed behind a button and supports both material types', () => {
    const source = read('components/NewMaterialPanel.tsx');
    assert.match(source, /Catat Kotoba \/ Bunpou/);
    assert.match(source, /type === 'kotoba'/);
    assert.match(source, /type === 'bunpou'/);
    assert.match(source, /\/api\/user-material/);
  });

  test('material writes derive ownership from the authenticated runtime user', () => {
    const source = read('app/api/user-material/route.ts');
    assert.match(source, /getRuntimeUsername\(\)/);
    assert.match(source, /from\('user_kotoba'\)\.insert/);
    assert.match(source, /from\('user_bunpou'\)\.insert/);
    assert.doesNotMatch(source, /payload\.username/);
  });

  test('new personal Kotoba becomes FSRS eligible on its first flashcard rating', () => {
    const source = read('app/api/flashcard-attempt/route.ts');
    assert.match(source, /payload\.kategori === 'kotoba_tambahan'/);
    assert.match(source, /'user_kotoba'/);
    assert.match(source, /isFsrsEligible = payload\.kategori === 'kotoba' \|\| payload\.kategori === 'kotoba_tambahan'/);
  });

  test('courses expose separate personal Kotoba and Bunpou review entry points', () => {
    const source = read('app/courses/CourseClientWrapper.tsx');
    assert.match(source, /Materi Tambahan Pribadi/);
    assert.match(source, /\/review\/kotoba-tambahan/);
    assert.match(source, /\/review\/bunpou-tambahan/);
  });
});

describe('v1.6 grouped Dokkai', () => {
  test('Dokkai follows JLPT section order and renders all questions in the active section together', () => {
    const source = read('features/quiz/DokkaiSession.tsx');
    assert.match(source, /\['tanbun', 'chuubun', 'tougou', 'chobun', 'jouhou'\]/);
    assert.match(source, /group\.questions\.map/);
    assert.match(source, /Lihat Pembahasan \{group\.label\}/);
    assert.match(source, /Lanjut ke Bagian Berikutnya/);
  });

  test('Dokkai includes the personal material capture button but no TTS', () => {
    const source = read('features/quiz/DokkaiSession.tsx');
    assert.match(source, /<NewMaterialPanel \/>/);
    assert.doesNotMatch(source, /TtsButton/);
  });
});
