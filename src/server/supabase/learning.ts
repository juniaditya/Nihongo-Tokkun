import 'server-only';

import { getSupabaseClient } from './client';
import { getRuntimeUsername } from '../runtimeUser';
import type {
  LearningSummary,
  LearningCategory,
  SectionProgress,
  FlashcardUnitProgress,
  ReviewQueueSummary,
} from '@/lib/types';

type QuizAttemptRow = {
  attempt_id: string;
  username: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  kategori: LearningCategory;
  nomor: number;
  bagian: string;
  total_soal: number;
  benar: number;
  salah: number;
  skor: number;
};

type AnswerRow = {
  attempt_id: string;
  question_source_id: string;
  question_index: number;
  is_correct: boolean;
  selected_answer: string;
  correct_answer: string;
  wrong_reason: string;
  wrong_reason_other: string;
  response_time_ms: number;
  answered_at: string;
};

type FlashAttemptRow = {
  attempt_id: string;
  username: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  kategori: string;
  nomor: number;
  bagian: string;
  total_kartu: number;
  good: number;
  again: number;
  skor: number;
};

type FlashHistoryRow = {
  attempt_id: string;
  card_id: string;
  result: 'Good' | 'Again';
  response_time_ms: number;
  reviewed_at: string;
};

type QuestionMeta = {
  sourceId: string;
  prompt: string;
  section: string;
  category: LearningCategory | '';
  lessonNumber: number;
};

type CardMeta = {
  sourceId: string;
  front: string;
  reading: string | null;
  meaning: string | null;
  category: string;
  lessonNumber: number;
};

const CHUNK = 100;

function chunks<T>(values: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

function millis(value: unknown): number {
  const n = new Date(String(value || '')).getTime();
  return Number.isFinite(n) ? n : 0;
}

function localDateKey(value: unknown): string {
  const date = new Date(String(value || ''));
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function currentLocalDateKey(offsetDays = 0): string {
  const now = new Date();
  const local = new Date(now.getTime() + offsetDays * 86400000);
  return localDateKey(local);
}

function computeStreak(dateKeys: Set<string>): number {
  if (!dateKeys.size) return 0;
  let streak = 0;
  let offset = 0;
  if (!dateKeys.has(currentLocalDateKey(0))) offset = -1;
  while (true) {
    const key = currentLocalDateKey(offset);
    if (!dateKeys.has(key)) break;
    streak += 1;
    offset -= 1;
  }
  return streak;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchAnswerRows(attemptIds: string[]): Promise<AnswerRow[]> {
  if (!attemptIds.length) return [];
  const sb = getSupabaseClient();
  const out: AnswerRow[] = [];
  for (const group of chunks(attemptIds)) {
    const { data, error } = await sb
      .from('answer_history')
      .select('attempt_id, question_source_id, question_index, is_correct, selected_answer, correct_answer, wrong_reason, wrong_reason_other, response_time_ms, answered_at')
      .in('attempt_id', group)
      .order('answered_at', { ascending: true });
    if (error) throw new Error(`[fetchAnswerRows] ${error.message}`);
    out.push(...((data ?? []) as AnswerRow[]));
  }
  return out;
}

async function fetchFlashHistory(attemptIds: string[]): Promise<FlashHistoryRow[]> {
  if (!attemptIds.length) return [];
  const sb = getSupabaseClient();
  const out: FlashHistoryRow[] = [];
  for (const group of chunks(attemptIds)) {
    const { data, error } = await sb
      .from('flashcard_history')
      .select('attempt_id, card_id, result, response_time_ms, reviewed_at')
      .in('attempt_id', group)
      .order('reviewed_at', { ascending: true });
    if (error) throw new Error(`[fetchFlashHistory] ${error.message}`);
    out.push(...((data ?? []) as FlashHistoryRow[]));
  }
  return out;
}

async function fetchQuestionMeta(sourceIds: string[]): Promise<Map<string, QuestionMeta>> {
  const unique = [...new Set(sourceIds.filter(Boolean))];
  const out = new Map<string, QuestionMeta>();
  if (!unique.length) return out;
  const sb = getSupabaseClient();

  for (const group of chunks(unique)) {
    const { data, error } = await sb
      .from('questions')
      .select('source_id, prompt, section, lesson_id, lessons(category, lesson_number)')
      .in('source_id', group);
    if (error) throw new Error(`[fetchQuestionMeta] ${error.message}`);
    for (const raw of data ?? []) {
      const row = raw as unknown as {
        source_id: string;
        prompt: string;
        section: string;
        lessons?: { category?: LearningCategory; lesson_number?: number } | Array<{ category?: LearningCategory; lesson_number?: number }> | null;
      };
      const rel = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
      out.set(row.source_id, {
        sourceId: row.source_id,
        prompt: row.prompt ?? '',
        section: row.section ?? '',
        category: rel?.category ?? '',
        lessonNumber: safeNumber(rel?.lesson_number),
      });
    }
  }
  return out;
}

async function fetchCardMeta(sourceIds: string[]): Promise<Map<string, CardMeta>> {
  const unique = [...new Set(sourceIds.filter(Boolean))];
  const out = new Map<string, CardMeta>();
  if (!unique.length) return out;
  const sb = getSupabaseClient();

  for (const group of chunks(unique)) {
    const { data, error } = await sb
      .from('flashcards')
      .select('source_id, front, back, lesson_id, lessons(category, lesson_number)')
      .in('source_id', group);
    if (error) throw new Error(`[fetchCardMeta] ${error.message}`);
    for (const raw of data ?? []) {
      const row = raw as unknown as {
        source_id: string;
        front: Record<string, string> | string | null;
        back: Record<string, string> | string | null;
        lessons?: { category?: string; lesson_number?: number } | Array<{ category?: string; lesson_number?: number }> | null;
      };
      const front = typeof row.front === 'object' && row.front ? row.front : {};
      const back = typeof row.back === 'object' && row.back ? row.back : {};
      const rel = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
      out.set(row.source_id, {
        sourceId: row.source_id,
        front: typeof row.front === 'string' ? row.front : front.depan ?? '',
        reading: typeof row.back === 'string' ? null : back.hiragana ?? null,
        meaning: typeof row.back === 'string' ? row.back : back.arti ?? back.fungsi ?? null,
        category: rel?.category ?? '',
        lessonNumber: safeNumber(rel?.lesson_number),
      });
    }
  }
  return out;
}

function updateSectionProgress(
  map: Record<string, SectionProgress>,
  kategori: LearningCategory,
  nomor: number,
  bagian: string,
  score: number,
  completedAt: string | null,
) {
  const key = `${kategori}|${nomor}|${bagian}`;
  const time = millis(completedAt);
  const prev = map[key];
  if (!prev) {
    map[key] = {
      kategori,
      nomor,
      bagian,
      attempts: 1,
      bestScore: score,
      lastScore: score,
      firstCompletedAt: completedAt,
      lastCompletedAt: completedAt,
    };
    return;
  }
  prev.attempts += 1;
  prev.bestScore = Math.max(prev.bestScore ?? -Infinity, score);
  if (time >= millis(prev.lastCompletedAt)) {
    prev.lastScore = score;
    prev.lastCompletedAt = completedAt;
  }
  if (!prev.firstCompletedAt || time <= millis(prev.firstCompletedAt)) prev.firstCompletedAt = completedAt;
}

export async function getLearningSummary(username?: string): Promise<LearningSummary> {
  const effectiveUsername = username ?? await getRuntimeUsername();
  const sb = getSupabaseClient();

  const [quizRes, flashRes] = await Promise.all([
    sb
      .from('attempts')
      .select('attempt_id, username, started_at, completed_at, duration_ms, kategori, nomor, bagian, total_soal, benar, salah, skor')
      .eq('username', effectiveUsername)
      .order('completed_at', { ascending: false }),
    sb
      .from('flashcard_attempts')
      .select('attempt_id, username, started_at, completed_at, duration_ms, kategori, nomor, bagian, total_kartu, good, again, skor')
      .eq('username', effectiveUsername)
      .neq('kategori', 'review_kotoba')
      .order('completed_at', { ascending: false }),
  ]);

  if (quizRes.error) throw new Error(`[getLearningSummary:attempts] ${quizRes.error.message}`);
  if (flashRes.error) throw new Error(`[getLearningSummary:flashcard_attempts] ${flashRes.error.message}`);

  const quizAttempts = (quizRes.data ?? []) as QuizAttemptRow[];
  const flashAttempts = (flashRes.data ?? []) as FlashAttemptRow[];
  const [answers, flashHistory] = await Promise.all([
    fetchAnswerRows(quizAttempts.map((x) => x.attempt_id)),
    fetchFlashHistory(flashAttempts.map((x) => x.attempt_id)),
  ]);

  const quizById = new Map(quizAttempts.map((a) => [a.attempt_id, a]));
  const flashById = new Map(flashAttempts.map((a) => [a.attempt_id, a]));
  const questionMeta = await fetchQuestionMeta(answers.map((a) => a.question_source_id));

  const totalCorrect = answers.reduce((sum, a) => sum + (a.is_correct ? 1 : 0), 0);
  const totalWrong = answers.length - totalCorrect;
  const totalQuizDurationMs = quizAttempts.reduce((sum, a) => sum + safeNumber(a.duration_ms), 0);
  const totalQuizResponseMs = answers.reduce((sum, a) => sum + safeNumber(a.response_time_ms), 0);
  const totalGood = flashHistory.reduce((sum, r) => sum + (r.result === 'Good' ? 1 : 0), 0);
  const totalAgain = flashHistory.length - totalGood;
  const totalFlashDurationMs = flashAttempts.reduce((sum, a) => sum + safeNumber(a.duration_ms), 0);
  const totalFlashResponseMs = flashHistory.reduce((sum, r) => sum + safeNumber(r.response_time_ms), 0);

  const byDayBagian: Record<string, SectionProgress> = {};
  for (const att of quizAttempts) {
    if (att.bagian !== 'mixed') {
      const bagian = att.kategori === 'dokkai' ? 'sesi' : att.bagian;
      updateSectionProgress(byDayBagian, att.kategori, att.nomor, bagian, safeNumber(att.skor), att.completed_at ?? null);
    }
  }

  // Mixed Kotoba is stored as one parent attempt, but Course UI needs the three
  // source-section scores separately (10/10/10). Reconstruct them from child rows.
  const mixedGroups = new Map<string, { parent: QuizAttemptRow; total: number; correct: number; section: string }>();
  for (const answer of answers) {
    const parent = quizById.get(answer.attempt_id);
    if (!parent || parent.kategori !== 'kotoba' || parent.bagian !== 'mixed') continue;
    const meta = questionMeta.get(answer.question_source_id);
    const section = meta?.section || '';
    if (!['penggunaan', 'yohou', 'ruigigo'].includes(section)) continue;
    const key = `${parent.attempt_id}|${section}`;
    const entry = mixedGroups.get(key) ?? { parent, total: 0, correct: 0, section };
    entry.total += 1;
    if (answer.is_correct) entry.correct += 1;
    mixedGroups.set(key, entry);
  }
  for (const entry of mixedGroups.values()) {
    const score = entry.total ? Math.round((entry.correct / entry.total) * 100) : 0;
    updateSectionProgress(byDayBagian, 'kotoba', entry.parent.nomor, entry.section, score, entry.parent.completed_at ?? null);
  }

  const byFlashcardUnit: Record<string, FlashcardUnitProgress> = {};
  for (const att of flashAttempts) {
    const key = `${att.kategori}|${att.nomor}`;
    const existing = byFlashcardUnit[key];
    if (!existing) {
      byFlashcardUnit[key] = {
        kategori: att.kategori,
        nomor: att.nomor,
        bagian: att.bagian || 'latihan',
        attempts: 1,
        bestScore: safeNumber(att.skor),
        lastScore: safeNumber(att.skor),
        avgScore: safeNumber(att.skor),
        totalReviews: 0,
        good: 0,
        again: 0,
        goodRate: 0,
        totalDurationMs: safeNumber(att.duration_ms),
        firstCompletedAt: att.completed_at ?? null,
        lastCompletedAt: att.completed_at ?? null,
      };
    } else {
      const oldTotal = existing.avgScore * existing.attempts;
      existing.attempts += 1;
      existing.avgScore = Math.round((oldTotal + safeNumber(att.skor)) / existing.attempts);
      existing.bestScore = Math.max(existing.bestScore ?? -Infinity, safeNumber(att.skor));
      existing.totalDurationMs += safeNumber(att.duration_ms);
      if (millis(att.completed_at) >= millis(existing.lastCompletedAt)) {
        existing.lastCompletedAt = att.completed_at;
        existing.lastScore = safeNumber(att.skor);
      }
      if (millis(att.completed_at) <= millis(existing.firstCompletedAt)) existing.firstCompletedAt = att.completed_at;
    }
  }
  for (const row of flashHistory) {
    const parent = flashById.get(row.attempt_id);
    if (!parent) continue;
    const key = `${parent.kategori}|${parent.nomor}`;
    const item = byFlashcardUnit[key];
    if (!item) continue;
    item.totalReviews += 1;
    if (row.result === 'Good') item.good += 1;
    if (row.result === 'Again') item.again += 1;
  }
  for (const item of Object.values(byFlashcardUnit)) {
    item.goodRate = item.totalReviews ? Math.round((item.good / item.totalReviews) * 100) : 0;
  }

  const wrongReasonCounts = new Map<string, number>();
  for (const answer of answers) {
    const reason = String(answer.wrong_reason || '').trim();
    if (!answer.is_correct && reason) wrongReasonCounts.set(reason, (wrongReasonCounts.get(reason) ?? 0) + 1);
  }
  const totalWithReason = [...wrongReasonCounts.values()].reduce((a, b) => a + b, 0);
  const wrongReasons = [...wrongReasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count, percentage: totalWithReason ? Math.round((count / totalWithReason) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const questionStats = new Map<string, { attempts: Set<string>; correct: number; wrong: number; responseMs: number; kategori: string; nomor: number; bagian: string }>();
  for (const answer of answers) {
    if (!answer.question_source_id) continue;
    const parent = quizById.get(answer.attempt_id);
    if (!parent) continue;
    const current = questionStats.get(answer.question_source_id) ?? {
      attempts: new Set<string>(), correct: 0, wrong: 0, responseMs: 0,
      kategori: parent.kategori, nomor: parent.nomor, bagian: parent.bagian,
    };
    if (current.attempts.has(answer.attempt_id)) continue;
    current.attempts.add(answer.attempt_id);
    if (answer.is_correct) current.correct += 1; else current.wrong += 1;
    current.responseMs += safeNumber(answer.response_time_ms);
    const meta = questionMeta.get(answer.question_source_id);
    if (parent.bagian === 'mixed' && meta?.section) current.bagian = meta.section;
    questionStats.set(answer.question_source_id, current);
  }
  const hardQuestions = [...questionStats.entries()]
    .filter(([, s]) => s.attempts.size >= 2)
    .map(([questionId, s]) => {
      const attempts = s.attempts.size;
      const meta = questionMeta.get(questionId);
      return {
        questionId,
        questionText: meta?.prompt || `QuestionID: ${questionId}`,
        kategori: s.kategori,
        nomor: s.nomor,
        bagian: s.bagian,
        attempts,
        correct: s.correct,
        wrong: s.wrong,
        accuracy: attempts ? Math.round((s.correct / attempts) * 100) : 0,
        avgResponseTimeMs: attempts ? Math.round(s.responseMs / attempts) : 0,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || b.avgResponseTimeMs - a.avgResponseTimeMs)
    .slice(0, 20);

  const cardStats = new Map<string, { reviews: number; good: number; again: number; responseMs: number; kategori: string; nomor: number; bagian: string }>();
  for (const review of flashHistory) {
    const parent = flashById.get(review.attempt_id);
    if (!parent || !review.card_id) continue;
    const current = cardStats.get(review.card_id) ?? {
      reviews: 0, good: 0, again: 0, responseMs: 0,
      kategori: parent.kategori, nomor: parent.nomor, bagian: parent.bagian,
    };
    current.reviews += 1;
    if (review.result === 'Good') current.good += 1; else current.again += 1;
    current.responseMs += safeNumber(review.response_time_ms);
    cardStats.set(review.card_id, current);
  }
  const hardCardIds = [...cardStats.entries()]
    .filter(([, s]) => s.reviews >= 2)
    .sort((a, b) => {
      const aa = Math.round((a[1].good / a[1].reviews) * 100);
      const bb = Math.round((b[1].good / b[1].reviews) * 100);
      return aa - bb || b[1].reviews - a[1].reviews || b[1].responseMs / b[1].reviews - a[1].responseMs / a[1].reviews;
    })
    .slice(0, 20)
    .map(([id]) => id);
  const cardMeta = await fetchCardMeta(hardCardIds);
  const hardFlashcards = hardCardIds.map((cardId) => {
    const s = cardStats.get(cardId)!;
    const meta = cardMeta.get(cardId);
    return {
      cardId,
      front: meta?.front || `CardID: ${cardId}`,
      reading: meta?.reading ?? null,
      meaning: meta?.meaning ?? null,
      kategori: s.kategori,
      nomor: s.nomor,
      bagian: s.bagian,
      reviews: s.reviews,
      good: s.good,
      again: s.again,
      goodRate: s.reviews ? Math.round((s.good / s.reviews) * 100) : 0,
      avgResponseTimeMs: s.reviews ? Math.round(s.responseMs / s.reviews) : 0,
    };
  });

  const dailyActivity: LearningSummary['dailyActivity'] = {};
  const activeDates = new Set<string>();
  const ensureDay = (date: string) => {
    if (!dailyActivity[date]) {
      dailyActivity[date] = {
        date, studyTimeMs: 0, quizAttempts: 0, questionsAnswered: 0,
        correctAnswers: 0, wrongAnswers: 0, flashcardAttempts: 0, flashcardReviews: 0,
      };
    }
    activeDates.add(date);
    return dailyActivity[date];
  };
  for (const att of quizAttempts) {
    const key = localDateKey(att.completed_at || att.started_at);
    if (!key) continue;
    const day = ensureDay(key);
    day.studyTimeMs += safeNumber(att.duration_ms);
    day.quizAttempts += 1;
    day.questionsAnswered += safeNumber(att.total_soal);
    day.correctAnswers += safeNumber(att.benar);
    day.wrongAnswers += safeNumber(att.salah);
  }
  for (const att of flashAttempts) {
    const key = localDateKey(att.completed_at || att.started_at);
    if (!key) continue;
    const day = ensureDay(key);
    day.studyTimeMs += safeNumber(att.duration_ms);
    day.flashcardAttempts += 1;
    day.flashcardReviews += safeNumber(att.total_kartu);
  }

  const recentAttempts = [
    ...quizAttempts.map((a) => ({
      type: 'quiz' as const,
      attemptId: a.attempt_id,
      completedAt: a.completed_at ?? null,
      kategori: a.kategori,
      nomor: a.nomor,
      bagian: a.bagian,
      totalCount: a.total_soal,
      score: a.skor,
      durationMs: a.duration_ms,
    })),
    ...flashAttempts.map((a) => ({
      type: 'flashcard' as const,
      attemptId: a.attempt_id,
      completedAt: a.completed_at ?? null,
      kategori: a.kategori,
      nomor: a.nomor,
      bagian: a.bagian || 'latihan',
      totalCount: a.total_kartu,
      score: a.skor,
      durationMs: a.duration_ms,
    })),
  ].sort((a, b) => millis(b.completedAt) - millis(a.completedAt)).slice(0, 15);

  return {
    username: effectiveUsername,
    overview: {
      totalQuizAttempts: quizAttempts.length,
      totalQuizAnswers: answers.length,
      totalCorrect,
      totalWrong,
      overallAccuracy: answers.length ? Math.round((totalCorrect / answers.length) * 100) : 0,
      totalQuizDurationMs,
      avgQuizDurationMs: quizAttempts.length ? Math.round(totalQuizDurationMs / quizAttempts.length) : 0,
      avgResponseTimeMs: answers.length ? Math.round(totalQuizResponseMs / answers.length) : 0,
      totalFlashcardAttempts: flashAttempts.length,
      totalFlashcardReviews: flashHistory.length,
      totalGood,
      totalAgain,
      flashcardGoodRate: flashHistory.length ? Math.round((totalGood / flashHistory.length) * 100) : 0,
      totalFlashcardDurationMs: totalFlashDurationMs,
      avgFlashcardDurationMs: flashAttempts.length ? Math.round(totalFlashDurationMs / flashAttempts.length) : 0,
      avgFlashcardResponseTimeMs: flashHistory.length ? Math.round(totalFlashResponseMs / flashHistory.length) : 0,
      totalStudyDurationMs: totalQuizDurationMs + totalFlashDurationMs,
      currentStreak: computeStreak(activeDates),
      totalActiveDays: activeDates.size,
    },
    completion: { byDayBagian, byFlashcardUnit },
    dailyActivity,
    recentAttempts,
    wrongReasons,
    hardQuestions,
    hardFlashcards,
  };
}

export async function getReviewQueueSummary(username?: string): Promise<ReviewQueueSummary> {
  const effectiveUsername = username ?? await getRuntimeUsername();
  const sb = getSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await sb
    .from('user_card_state')
    .select('due_at, review_count, good_count, again_count')
    .eq('username', effectiveUsername)
    .lte('due_at', nowIso)
    .order('due_at', { ascending: true });
  if (error) throw new Error(`[getReviewQueueSummary] ${error.message}`);
  const rows = data ?? [];
  const totalReviewCount = rows.reduce((sum, r) => sum + safeNumber(r.review_count), 0);
  const totalGood = rows.reduce((sum, r) => sum + safeNumber(r.good_count), 0);
  const totalAgain = rows.reduce((sum, r) => sum + safeNumber(r.again_count), 0);
  const rated = totalGood + totalAgain;
  return {
    dueCount: rows.length,
    totalReviewCount,
    totalGood,
    totalAgain,
    recallRate: rated ? Math.round((totalGood / rated) * 100) : null,
    nextDueAt: rows[0]?.due_at ?? null,
  };
}
