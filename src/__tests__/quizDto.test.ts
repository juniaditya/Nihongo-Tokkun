import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { QuizQuestion, QuizOption, QuizPassage, QuizSessionData } from '../lib/quizTypes.ts';

// ---- Helpers ----------------------------------------------------------------

function makeOption(optionIndex: number, isCorrect = false): QuizOption {
  return {
    id: `opt-${optionIndex}`,
    optionIndex,
    text: `Option ${optionIndex}`,
    isCorrect,
    explanation: isCorrect ? 'Correct explanation' : null,
  };
}

function makeQuestion(
  questionIndex: number,
  section: string,
  passageSourceId: string | null = null
): QuizQuestion {
  return {
    id: `q-${questionIndex}`,
    sourceId: `src-${questionIndex}`,
    prompt: `Prompt for question ${questionIndex}`,
    passageSourceId,
    section,
    questionIndex,
    options: [
      makeOption(0, false),
      makeOption(1, true),  // correct at index 1
      makeOption(2, false),
      makeOption(3, false),
    ],
  };
}

function makePassage(sourceId: string, type: 'single' | 'two' = 'single'): QuizPassage {
  return {
    id: `passage-uuid-${sourceId}`,
    sourceId,
    passageType: type,
    textA: 'Primary text content',
    textB: type === 'two' ? 'Secondary text content' : null,
  };
}

// ---- question_index ordering -----------------------------------------------
describe('question_index ordering', () => {
  test('questions sorted by question_index ASC', () => {
    const questions: QuizQuestion[] = [
      makeQuestion(3, 'arti'),
      makeQuestion(0, 'arti'),
      makeQuestion(2, 'arti'),
      makeQuestion(1, 'arti'),
    ];
    const sorted = [...questions].sort((a, b) => a.questionIndex - b.questionIndex);
    assert.deepEqual(sorted.map((q) => q.questionIndex), [0, 1, 2, 3]);
  });

  test('questionIndex field is present and numeric', () => {
    const q = makeQuestion(5, 'cara_baca');
    assert.equal(typeof q.questionIndex, 'number');
    assert.equal(q.questionIndex, 5);
  });
});

// ---- option_index ordering -------------------------------------------------
describe('option_index ordering', () => {
  test('options sorted by option_index ASC', () => {
    const opts: QuizOption[] = [
      makeOption(3),
      makeOption(0, true),
      makeOption(2),
      makeOption(1),
    ];
    const sorted = [...opts].sort((a, b) => a.optionIndex - b.optionIndex);
    assert.deepEqual(sorted.map((o) => o.optionIndex), [0, 1, 2, 3]);
  });

  test('exactly one correct option per question', () => {
    const q = makeQuestion(0, 'arti');
    const correctOpts = q.options.filter((o) => o.isCorrect);
    assert.equal(correctOpts.length, 1);
  });

  test('4 options per question', () => {
    const q = makeQuestion(0, 'arti');
    assert.equal(q.options.length, 4);
  });
});

// ---- Kotoba DTO ------------------------------------------------------------
describe('Kotoba QuizSessionData shape', () => {
  const session: QuizSessionData = {
    lesson: { id: 'lesson-uuid', category: 'kotoba', lessonNumber: 1, label: 'Kotoba 1' },
    section: null,
    mode: null,
    availableSections: ['arti', 'cara_baca', 'penggunaan', 'yohou', 'ruigigo'],
    questions: [
      makeQuestion(0, 'arti'),
      makeQuestion(1, 'cara_baca'),
      makeQuestion(2, 'penggunaan'),
    ],
    passages: {}, // Kotoba has no passages
  };

  test('category is kotoba', () => assert.equal(session.lesson.category, 'kotoba'));
  test('passages is empty for kotoba', () => assert.equal(Object.keys(session.passages).length, 0));
  test('all questions have null passageSourceId', () => {
    assert.ok(session.questions.every((q) => q.passageSourceId === null));
  });
  test('has kotoba sections', () => {
    assert.ok(session.availableSections.includes('arti'));
    assert.ok(session.availableSections.includes('cara_baca'));
  });
});

// ---- Bunpou DTO ------------------------------------------------------------
describe('Bunpou QuizSessionData shape', () => {
  const session: QuizSessionData = {
    lesson: { id: 'bunpou-uuid', category: 'bunpou', lessonNumber: 1, label: 'Bunpou 1' },
    section: null,
    mode: null,
    availableSections: ['arti_fungsi', 'bentuk_koneksi', 'perbedaan_grammar', 'penggunaan_kalimat'],
    questions: [makeQuestion(0, 'arti_fungsi'), makeQuestion(1, 'bentuk_koneksi')],
    passages: {},
  };

  test('category is bunpou', () => assert.equal(session.lesson.category, 'bunpou'));
  test('no passages for bunpou', () => assert.equal(Object.keys(session.passages).length, 0));
  test('bunpou sections present', () => {
    assert.ok(session.availableSections.includes('arti_fungsi'));
    assert.ok(session.availableSections.includes('perbedaan_grammar'));
  });
});

// ---- Dokkai passage association --------------------------------------------
describe('Dokkai passage association', () => {
  const passage = makePassage('q-0:passage', 'single');
  const tougouPassage = makePassage('q-5:passage', 'two');

  const session: QuizSessionData = {
    lesson: { id: 'dokkai-uuid', category: 'dokkai', lessonNumber: 1, label: 'Dokkai 1' },
    section: null,
    mode: null,
    availableSections: ['tanbun', 'chuubun', 'tougou'],
    questions: [
      makeQuestion(0, 'tanbun', 'q-0:passage'),   // single passage
      makeQuestion(1, 'tanbun', 'q-0:passage'),   // same passage
      makeQuestion(5, 'tougou', 'q-5:passage'),   // two-passage tougou
    ],
    passages: {
      'q-0:passage': passage,
      'q-5:passage': tougouPassage,
    },
  };

  test('category is dokkai', () => assert.equal(session.lesson.category, 'dokkai'));

  test('passages record is keyed by source_id', () => {
    assert.ok('q-0:passage' in session.passages);
    assert.ok('q-5:passage' in session.passages);
  });

  test('single passage has passageType=single and no textB', () => {
    const p = session.passages['q-0:passage'];
    assert.equal(p.passageType, 'single');
    assert.equal(p.textB, null);
  });

  test('tougou passage has passageType=two and textB present', () => {
    const p = session.passages['q-5:passage'];
    assert.equal(p.passageType, 'two');
    assert.notEqual(p.textB, null);
  });

  test('questions reference passageSourceId that exists in passages', () => {
    for (const q of session.questions) {
      if (q.passageSourceId) {
        assert.ok(q.passageSourceId in session.passages, `passage ${q.passageSourceId} missing`);
      }
    }
  });

  test('tanbun questions share same passage', () => {
    const tanbunQs = session.questions.filter((q) => q.section === 'tanbun');
    const ids = new Set(tanbunQs.map((q) => q.passageSourceId));
    assert.equal(ids.size, 1); // all share one passage
  });
});
