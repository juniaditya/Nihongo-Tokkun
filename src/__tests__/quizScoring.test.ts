import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { QuizOption } from '../lib/quizTypes.ts';

// ---------------------------------------------------------------------------
// Simulate the scoring logic extracted from QuizShell
// (pure functions, no React dependency)
// ---------------------------------------------------------------------------

interface ScoringState {
  correct: number;
  answeredCount: number;
  selectedOption: QuizOption | null;
  questionIndex: number;
  totalQuestions: number;
}

function makeOption(isCorrect: boolean): QuizOption {
  return {
    id: `opt-${Math.random()}`,
    optionIndex: 0,
    text: 'Option text',
    isCorrect,
    explanation: null,
  };
}

function selectAnswer(state: ScoringState, option: QuizOption): ScoringState {
  if (state.selectedOption != null) return state; // already answered
  return {
    ...state,
    selectedOption: option,
    answeredCount: state.answeredCount + 1,
    correct: state.correct + (option.isCorrect ? 1 : 0),
  };
}

function advance(state: ScoringState): ScoringState {
  const nextIndex = state.questionIndex + 1;
  return {
    ...state,
    questionIndex: nextIndex,
    selectedOption: null,
  };
}

function isCompleted(state: ScoringState): boolean {
  return state.questionIndex >= state.totalQuestions;
}

function hasUnsavedProgress(state: ScoringState): boolean {
  return state.answeredCount > 0 && !isCompleted(state);
}

// ---------------------------------------------------------------------------

describe('quiz local scoring', () => {
  const initial: ScoringState = {
    correct: 0,
    answeredCount: 0,
    selectedOption: null,
    questionIndex: 0,
    totalQuestions: 5,
  };

  test('correct answer increments correct count', () => {
    const state = selectAnswer(initial, makeOption(true));
    assert.equal(state.correct, 1);
    assert.equal(state.answeredCount, 1);
  });

  test('wrong answer does not increment correct count', () => {
    const state = selectAnswer(initial, makeOption(false));
    assert.equal(state.correct, 0);
    assert.equal(state.answeredCount, 1);
  });

  test('selecting twice does not double-count', () => {
    let state = selectAnswer(initial, makeOption(true));
    state = selectAnswer(state, makeOption(true)); // should be ignored
    assert.equal(state.correct, 1);
    assert.equal(state.answeredCount, 1);
  });

  test('advancing clears selectedOption', () => {
    let state = selectAnswer(initial, makeOption(true));
    state = advance(state);
    assert.equal(state.selectedOption, null);
    assert.equal(state.questionIndex, 1);
  });

  test('accumulated score over multiple questions', () => {
    let state = { ...initial, totalQuestions: 3 };
    state = selectAnswer(state, makeOption(true));
    state = advance(state);
    state = selectAnswer(state, makeOption(false));
    state = advance(state);
    state = selectAnswer(state, makeOption(true));
    state = advance(state);
    assert.equal(state.correct, 2);
    assert.equal(state.answeredCount, 3);
  });
});

describe('completion detection', () => {
  test('not completed at start', () => {
    const state: ScoringState = {
      correct: 0, answeredCount: 0, selectedOption: null,
      questionIndex: 0, totalQuestions: 3,
    };
    assert.equal(isCompleted(state), false);
  });

  test('completed when questionIndex >= totalQuestions', () => {
    const state: ScoringState = {
      correct: 2, answeredCount: 3, selectedOption: null,
      questionIndex: 3, totalQuestions: 3,
    };
    assert.equal(isCompleted(state), true);
  });

  test('not completed at last question (before advance)', () => {
    const state: ScoringState = {
      correct: 0, answeredCount: 0, selectedOption: null,
      questionIndex: 2, totalQuestions: 3,
    };
    assert.equal(isCompleted(state), false);
  });
});

describe('exit-unsaved detection', () => {
  test('no unsaved progress at start', () => {
    const state: ScoringState = {
      correct: 0, answeredCount: 0, selectedOption: null,
      questionIndex: 0, totalQuestions: 5,
    };
    assert.equal(hasUnsavedProgress(state), false);
  });

  test('unsaved progress after answering one question mid-quiz', () => {
    let state: ScoringState = {
      correct: 0, answeredCount: 0, selectedOption: null,
      questionIndex: 0, totalQuestions: 5,
    };
    state = selectAnswer(state, makeOption(true));
    state = advance(state);
    assert.equal(hasUnsavedProgress(state), true);
  });

  test('no unsaved progress after completing all questions', () => {
    let state: ScoringState = {
      correct: 0, answeredCount: 0, selectedOption: null,
      questionIndex: 0, totalQuestions: 2,
    };
    state = selectAnswer(state, makeOption(true));
    state = advance(state);
    state = selectAnswer(state, makeOption(false));
    state = advance(state);
    assert.equal(isCompleted(state), true);
    assert.equal(hasUnsavedProgress(state), false);
  });
});
