// Pure FSRS-6 subset ported from the production Apps Script implementation.
// Ratings exposed by Nihongo Tokkun are Again=1 and Good=3.

export const FSRS_PARAMETERS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194,
  0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629,
  1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;
const REQUEST_RETENTION = 0.90;
const MAX_INTERVAL_DAYS = 36500;
const LEARNING_STEPS_MINUTES = [1, 10] as const;
const RELEARNING_STEPS_MINUTES = [10] as const;

export interface FsrsStateInput {
  cardId: string;
  sourceType: 'course_kotoba' | 'user_kotoba';
  sourceKategori: string;
  sourceNomor: number;
  sourceBagian: string;
  firstReviewedAt: string;
  lastReviewedAt: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  fsrsState: 'Learning' | 'Review' | 'Relearning';
  learningStep: number | null;
  reviewCount: number;
  goodCount: number;
  againCount: number;
  lapseCount: number;
  lastRating: 1 | 3;
  stateVersion: number;
}

export interface FsrsReviewEvent {
  cardId: string;
  result: 'Good' | 'Again';
  reviewedAt: string;
  sourceType: 'course_kotoba' | 'user_kotoba';
  sourceKategori: string;
  sourceNomor: number;
  sourceBagian: string;
}

export interface FsrsStateOutput extends Omit<FsrsStateInput, 'stateVersion'> {
  expectedStateVersion: number;
}

function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function initialStability(rating: 1 | 3) { return Math.max(FSRS_PARAMETERS[rating - 1], 0.001); }
function initialDifficulty(rating: 1 | 3, shouldClamp = true) {
  const value = FSRS_PARAMETERS[4] - Math.exp(FSRS_PARAMETERS[5] * (rating - 1)) + 1;
  return shouldClamp ? clamp(value, 1, 10) : value;
}
function nextDifficulty(difficulty: number, rating: 1 | 3) {
  const delta = -(FSRS_PARAMETERS[6] * (rating - 3));
  const damped = difficulty + ((10 - difficulty) * delta / 9);
  return clamp(FSRS_PARAMETERS[7] * initialDifficulty(3, false) + (1 - FSRS_PARAMETERS[7]) * damped, 1, 10);
}
function retrievability(elapsedDays: number, stability: number) {
  const decay = -FSRS_PARAMETERS[20];
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return Math.pow(1 + factor * Math.max(0, elapsedDays) / stability, decay);
}
function shortTermStability(stability: number, rating: 1 | 3) {
  let increase = Math.exp(FSRS_PARAMETERS[17] * (rating - 3 + FSRS_PARAMETERS[18])) * Math.pow(stability, -FSRS_PARAMETERS[19]);
  if (rating >= 2) increase = Math.max(increase, 1);
  return Math.max(stability * increase, 0.001);
}
function nextForgetStability(difficulty: number, stability: number, r: number) {
  const longTerm = FSRS_PARAMETERS[11] * Math.pow(difficulty, -FSRS_PARAMETERS[12]) *
    (Math.pow(stability + 1, FSRS_PARAMETERS[13]) - 1) * Math.exp((1 - r) * FSRS_PARAMETERS[14]);
  const shortTerm = stability / Math.exp(FSRS_PARAMETERS[17] * FSRS_PARAMETERS[18]);
  return Math.max(Math.min(longTerm, shortTerm), 0.001);
}
function nextRecallStability(difficulty: number, stability: number, r: number) {
  return Math.max(stability * (1 + Math.exp(FSRS_PARAMETERS[8]) * (11 - difficulty) *
    Math.pow(stability, -FSRS_PARAMETERS[9]) * (Math.exp((1 - r) * FSRS_PARAMETERS[10]) - 1)), 0.001);
}
function nextIntervalDays(stability: number) {
  const decay = -FSRS_PARAMETERS[20];
  const factor = Math.pow(0.9, 1 / decay) - 1;
  const interval = Math.round((stability / factor) * (Math.pow(REQUEST_RETENTION, 1 / decay) - 1));
  return Math.min(Math.max(interval, 1), MAX_INTERVAL_DAYS);
}

export function applyFsrsReview(previous: FsrsStateInput | null, event: FsrsReviewEvent): FsrsStateOutput {
  const rating: 1 | 3 = event.result === 'Again' ? 1 : 3;
  const at = new Date(event.reviewedAt);
  if (!Number.isFinite(at.getTime())) throw new Error('reviewedAt tidak valid.');

  const state = previous?.fsrsState ?? 'Learning';
  let step: number | null = previous?.learningStep ?? 0;
  let stability = previous?.stability ?? null;
  let difficulty = previous?.difficulty ?? null;
  const lastAt = previous?.lastReviewedAt ? new Date(previous.lastReviewedAt) : null;
  const elapsedDays = lastAt && Number.isFinite(lastAt.getTime())
    ? Math.max(0, Math.floor((at.getTime() - lastAt.getTime()) / 86400000))
    : null;

  if (stability == null || !Number.isFinite(stability) || difficulty == null || !Number.isFinite(difficulty)) {
    stability = initialStability(rating);
    difficulty = initialDifficulty(rating, true);
  } else if (elapsedDays !== null && elapsedDays < 1) {
    stability = shortTermStability(stability, rating);
    difficulty = nextDifficulty(difficulty, rating);
  } else {
    const r = retrievability(elapsedDays ?? 0, stability);
    stability = rating === 1 ? nextForgetStability(difficulty, stability, r) : nextRecallStability(difficulty, stability, r);
    difficulty = nextDifficulty(difficulty, rating);
  }

  let nextState = state;
  let dueMs: number;
  if (state === 'Learning') {
    const currentStep = step ?? 0;
    if (rating === 1) { step = 0; dueMs = at.getTime() + LEARNING_STEPS_MINUTES[0] * 60000; }
    else if (currentStep + 1 >= LEARNING_STEPS_MINUTES.length) { nextState = 'Review'; step = null; dueMs = at.getTime() + nextIntervalDays(stability) * 86400000; }
    else { step = currentStep + 1; dueMs = at.getTime() + LEARNING_STEPS_MINUTES[step] * 60000; }
  } else if (state === 'Review') {
    if (rating === 1) { nextState = 'Relearning'; step = 0; dueMs = at.getTime() + RELEARNING_STEPS_MINUTES[0] * 60000; }
    else { step = null; dueMs = at.getTime() + nextIntervalDays(stability) * 86400000; }
  } else {
    if (rating === 1) { step = 0; dueMs = at.getTime() + RELEARNING_STEPS_MINUTES[0] * 60000; }
    else { nextState = 'Review'; step = null; dueMs = at.getTime() + nextIntervalDays(stability) * 86400000; }
  }

  return {
    cardId: event.cardId,
    sourceType: event.sourceType,
    sourceKategori: event.sourceKategori,
    sourceNomor: event.sourceNomor,
    sourceBagian: event.sourceBagian,
    firstReviewedAt: previous?.firstReviewedAt ?? event.reviewedAt,
    lastReviewedAt: event.reviewedAt,
    dueAt: new Date(dueMs).toISOString(),
    stability,
    difficulty,
    fsrsState: nextState,
    learningStep: step,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    goodCount: (previous?.goodCount ?? 0) + (rating === 3 ? 1 : 0),
    againCount: (previous?.againCount ?? 0) + (rating === 1 ? 1 : 0),
    lapseCount: (previous?.lapseCount ?? 0) + (rating === 1 ? 1 : 0),
    lastRating: rating,
    expectedStateVersion: previous?.stateVersion ?? 0,
  };
}
