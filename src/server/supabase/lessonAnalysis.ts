import 'server-only';

import { getSupabaseClient } from './client';
import { getRuntimeUsername } from '../runtimeUser';
import type {
  LessonAnalysis,
  LessonSummary,
  LessonProgressItem,
  WrongReasonSummary,
} from '@/lib/types';

type QuizAttemptRow = {
  attempt_id: string;
  completed_at: string | null;
  duration_ms: number;
  bagian: string;
  total_soal: number;
  benar: number;
  salah: number;
  skor: number;
};

type AnswerRow = {
  attempt_id: string;
  question_source_id: string;
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
  completed_at: string | null;
  duration_ms: number;
  bagian: string;
  total_kartu: number;
  good: number;
  again: number;
  skor: number;
};

type FlashHistoryRow = {
  attempt_id: string;
  result: 'Good' | 'Again';
};

type QuestionMeta = {
  source_id: string;
  prompt: string;
  section: string;
};

const SECTION_LABELS: Record<string, string> = {
  arti: 'Arti',
  cara_baca: 'Cara Baca',
  mixed: 'Latihan Campuran',
  penggunaan: 'Penggunaan dalam Kalimat',
  yohou: '用法',
  ruigigo: '類義語・使い分け',
  arti_fungsi: 'Arti & Fungsi',
  bentuk_koneksi: 'Bentuk & Koneksi',
  perbedaan_grammar: 'Perbedaan Grammar Mirip',
  penggunaan_kalimat: 'Penggunaan dalam Kalimat',
  sesi: 'Sesi Membaca',
  latihan: 'Latihan',
  flashcard: 'Latihan Flashcard',
};

const WRONG_REASON_LABELS: Record<string, string> = {
  lupa_arti: 'Lupa artinya',
  tidak_ngerti: 'Tidak mengerti soal/bacaan',
  buru_buru: 'Terburu-buru / salah klik',
  terkecoh: 'Terkecoh pilihan lain',
  terkecoh_pilihan: 'Terkecoh pilihan lain',
  salah_baca: 'Salah baca soal',
  lainnya: 'Lainnya',
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function millis(value: unknown): number {
  const n = new Date(String(value ?? '')).getTime();
  return Number.isFinite(n) ? n : 0;
}

function formatLabel(key: string): string {
  return SECTION_LABELS[key] ?? key.replaceAll('_', ' ');
}

function chunk<T>(values: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function fetchAnswers(attemptIds: string[]): Promise<AnswerRow[]> {
  if (!attemptIds.length) return [];
  const sb = getSupabaseClient();
  const out: AnswerRow[] = [];
  for (const group of chunk(attemptIds)) {
    const { data, error } = await sb
      .from('answer_history')
      .select('attempt_id, question_source_id, is_correct, selected_answer, correct_answer, wrong_reason, wrong_reason_other, response_time_ms, answered_at')
      .in('attempt_id', group)
      .order('answered_at', { ascending: false });
    if (error) throw new Error(`[getLessonAnalysis:answer_history] ${error.message}`);
    out.push(...((data ?? []) as AnswerRow[]));
  }
  return out;
}

async function fetchFlashHistory(attemptIds: string[]): Promise<FlashHistoryRow[]> {
  if (!attemptIds.length) return [];
  const sb = getSupabaseClient();
  const out: FlashHistoryRow[] = [];
  for (const group of chunk(attemptIds)) {
    const { data, error } = await sb
      .from('flashcard_history')
      .select('attempt_id, result')
      .in('attempt_id', group);
    if (error) throw new Error(`[getLessonAnalysis:flashcard_history] ${error.message}`);
    out.push(...((data ?? []) as FlashHistoryRow[]));
  }
  return out;
}

async function fetchQuestionMeta(sourceIds: string[]): Promise<Map<string, QuestionMeta>> {
  const ids = [...new Set(sourceIds.filter(Boolean))];
  const map = new Map<string, QuestionMeta>();
  if (!ids.length) return map;
  const sb = getSupabaseClient();
  for (const group of chunk(ids)) {
    const { data, error } = await sb
      .from('questions')
      .select('source_id, prompt, section')
      .in('source_id', group);
    if (error) throw new Error(`[getLessonAnalysis:questions] ${error.message}`);
    for (const row of (data ?? []) as QuestionMeta[]) map.set(row.source_id, row);
  }
  return map;
}

function aggregateQuizProgress(
  lesson: LessonSummary,
  attempts: QuizAttemptRow[],
  answers: AnswerRow[],
  meta: Map<string, QuestionMeta>,
): LessonProgressItem[] {
  const byAttempt = new Map(attempts.map((a) => [a.attempt_id, a]));
  const answerStats = new Map<string, { total: number; correct: number }>();

  for (const answer of answers) {
    const parent = byAttempt.get(answer.attempt_id);
    if (!parent) continue;
    const questionSection = meta.get(answer.question_source_id)?.section ?? '';
    const key = parent.bagian === 'mixed' ? 'mixed' : (parent.bagian || questionSection || 'latihan');
    const stat = answerStats.get(key) ?? { total: 0, correct: 0 };
    stat.total += 1;
    if (answer.is_correct) stat.correct += 1;
    answerStats.set(key, stat);
  }

  const group = new Map<string, QuizAttemptRow[]>();
  for (const attempt of attempts) {
    const key = attempt.bagian || (lesson.category === 'dokkai' ? 'sesi' : 'latihan');
    const rows = group.get(key) ?? [];
    rows.push(attempt);
    group.set(key, rows);
  }

  const keys = lesson.category === 'kotoba'
    ? ['arti', 'cara_baca', 'mixed']
    : lesson.category === 'bunpou'
      ? ['arti_fungsi', 'bentuk_koneksi', 'perbedaan_grammar', 'penggunaan_kalimat']
      : ['sesi'];

  return keys.map((key) => {
    let rows = group.get(key) ?? [];
    let stats = answerStats.get(key);

    // Historical Apps Script data may store the three mixed components separately.
    // Collapse that legacy representation into one "Latihan Campuran" row when a
    // dedicated `mixed` attempt does not exist yet.
    if (key === 'mixed' && !rows.length) {
      const legacyKeys = ['penggunaan', 'yohou', 'ruigigo'];
      rows = legacyKeys.flatMap((legacyKey) => group.get(legacyKey) ?? []);
      const totals = legacyKeys.map((legacyKey) => answerStats.get(legacyKey)).filter(Boolean) as Array<{ total: number; correct: number }>;
      if (totals.length) {
        stats = totals.reduce((acc, item) => ({ total: acc.total + item.total, correct: acc.correct + item.correct }), { total: 0, correct: 0 });
      }
    }

    const sorted = rows.slice().sort((a, b) => millis(b.completed_at) - millis(a.completed_at));
    const scores = rows.map((a) => safeNumber(a.skor));
    return {
      key,
      label: formatLabel(key),
      kind: 'quiz' as const,
      attempts: rows.length,
      bestScore: scores.length ? Math.max(...scores) : null,
      lastScore: sorted.length ? safeNumber(sorted[0].skor) : null,
      accuracy: stats?.total ? Math.round((stats.correct / stats.total) * 100) : null,
      totalItems: stats?.total ?? rows.reduce((sum, row) => sum + safeNumber(row.total_soal), 0),
    };
  });
}

export async function getLessonAnalysis(
  lesson: LessonSummary,
  username?: string,
): Promise<LessonAnalysis> {
  const effectiveUsername = username ?? await getRuntimeUsername();
  const sb = getSupabaseClient();
  const [quizRes, flashRes] = await Promise.all([
    sb
      .from('attempts')
      .select('attempt_id, completed_at, duration_ms, bagian, total_soal, benar, salah, skor')
      .eq('username', effectiveUsername)
      .eq('kategori', lesson.category)
      .eq('nomor', lesson.dayNumber)
      .order('completed_at', { ascending: false }),
    lesson.category === 'dokkai'
      ? Promise.resolve({ data: [], error: null })
      : sb
          .from('flashcard_attempts')
          .select('attempt_id, completed_at, duration_ms, bagian, total_kartu, good, again, skor')
          .eq('username', effectiveUsername)
          .eq('kategori', lesson.category)
          .eq('nomor', lesson.dayNumber)
          .order('completed_at', { ascending: false }),
  ]);

  if (quizRes.error) throw new Error(`[getLessonAnalysis:attempts] ${quizRes.error.message}`);
  if (flashRes.error) throw new Error(`[getLessonAnalysis:flashcard_attempts] ${flashRes.error.message}`);

  const quizAttempts = (quizRes.data ?? []) as QuizAttemptRow[];
  const flashAttempts = (flashRes.data ?? []) as FlashAttemptRow[];
  const [answers, flashHistory] = await Promise.all([
    fetchAnswers(quizAttempts.map((x) => x.attempt_id)),
    fetchFlashHistory(flashAttempts.map((x) => x.attempt_id)),
  ]);
  const questionMeta = await fetchQuestionMeta(answers.map((x) => x.question_source_id));
  const quizById = new Map(quizAttempts.map((a) => [a.attempt_id, a]));

  const quizProgress = aggregateQuizProgress(lesson, quizAttempts, answers, questionMeta);
  const flashScores = flashAttempts.map((x) => safeNumber(x.skor));
  const sortedFlash = flashAttempts.slice().sort((a, b) => millis(b.completed_at) - millis(a.completed_at));
  const flashGood = flashHistory.filter((x) => x.result === 'Good').length;
  const flashProgress: LessonProgressItem[] = lesson.category === 'dokkai' ? [] : [{
    key: 'flashcard',
    label: 'Latihan Flashcard',
    kind: 'flashcard',
    attempts: flashAttempts.length,
    bestScore: flashScores.length ? Math.max(...flashScores) : null,
    lastScore: sortedFlash.length ? safeNumber(sortedFlash[0].skor) : null,
    accuracy: flashHistory.length ? Math.round((flashGood / flashHistory.length) * 100) : null,
    totalItems: flashHistory.length,
  }];

  const progress = lesson.category === 'kotoba'
    ? [flashProgress[0], ...quizProgress].filter(Boolean) as LessonProgressItem[]
    : [...quizProgress, ...flashProgress];

  const wrongAnswers = answers.filter((x) => !x.is_correct);
  const wrongReasonCounts = new Map<string, number>();
  for (const answer of wrongAnswers) {
    const reason = String(answer.wrong_reason || '').trim();
    if (!reason) continue;
    wrongReasonCounts.set(reason, (wrongReasonCounts.get(reason) ?? 0) + 1);
  }
  const reasonTotal = [...wrongReasonCounts.values()].reduce((sum, n) => sum + n, 0);
  const wrongReasons: WrongReasonSummary[] = [...wrongReasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count, percentage: reasonTotal ? Math.round((count / reasonTotal) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const recentMistakes = wrongAnswers
    .slice()
    .sort((a, b) => millis(b.answered_at) - millis(a.answered_at))
    .slice(0, 10)
    .map((answer) => {
      const q = questionMeta.get(answer.question_source_id);
      return {
        questionSourceId: answer.question_source_id,
        questionText: q?.prompt || `QuestionID: ${answer.question_source_id}`,
        section: q?.section || quizById.get(answer.attempt_id)?.bagian || '',
        selectedAnswer: answer.selected_answer || '—',
        correctAnswer: answer.correct_answer || '—',
        reason: WRONG_REASON_LABELS[answer.wrong_reason] ?? answer.wrong_reason ?? '',
        reasonOther: answer.wrong_reason_other || '',
        responseTimeMs: safeNumber(answer.response_time_ms),
        answeredAt: answer.answered_at,
      };
    });

  const qStats = new Map<string, { attempts: number; correct: number; wrong: number; section: string }>();
  for (const answer of answers) {
    const current = qStats.get(answer.question_source_id) ?? {
      attempts: 0,
      correct: 0,
      wrong: 0,
      section: questionMeta.get(answer.question_source_id)?.section ?? '',
    };
    current.attempts += 1;
    if (answer.is_correct) current.correct += 1; else current.wrong += 1;
    qStats.set(answer.question_source_id, current);
  }
  const hardQuestions = [...qStats.entries()]
    .filter(([, stat]) => stat.wrong > 0)
    .map(([questionSourceId, stat]) => ({
      questionSourceId,
      questionText: questionMeta.get(questionSourceId)?.prompt || `QuestionID: ${questionSourceId}`,
      section: stat.section,
      attempts: stat.attempts,
      wrong: stat.wrong,
      accuracy: stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 8);

  const recentHistory = [
    ...quizAttempts.map((a) => ({
      type: 'quiz' as const,
      attemptId: a.attempt_id,
      completedAt: a.completed_at,
      label: formatLabel(a.bagian || (lesson.category === 'dokkai' ? 'sesi' : 'latihan')),
      score: safeNumber(a.skor),
      totalCount: safeNumber(a.total_soal),
      correctCount: safeNumber(a.benar),
      wrongCount: safeNumber(a.salah),
      durationMs: safeNumber(a.duration_ms),
    })),
    ...flashAttempts.map((a) => ({
      type: 'flashcard' as const,
      attemptId: a.attempt_id,
      completedAt: a.completed_at,
      label: 'Latihan Flashcard',
      score: safeNumber(a.skor),
      totalCount: safeNumber(a.total_kartu),
      correctCount: safeNumber(a.good),
      wrongCount: safeNumber(a.again),
      durationMs: safeNumber(a.duration_ms),
    })),
  ]
    .sort((a, b) => millis(b.completedAt) - millis(a.completedAt))
    .slice(0, 12);

  const answerCorrect = answers.filter((x) => x.is_correct).length;
  const totalStudyDurationMs = quizAttempts.reduce((sum, x) => sum + safeNumber(x.duration_ms), 0)
    + flashAttempts.reduce((sum, x) => sum + safeNumber(x.duration_ms), 0);

  const insights: string[] = [];
  const attemptedProgress = progress.filter((x) => x.bestScore != null);
  if (attemptedProgress.length) {
    const weakest = attemptedProgress.slice().sort((a, b) => (a.bestScore ?? 101) - (b.bestScore ?? 101))[0];
    if ((weakest.bestScore ?? 100) < 90) insights.push(`Prioritas berikutnya: ${weakest.label} — skor terbaik ${weakest.bestScore}%, masih di bawah target 90%.`);
    else insights.push('Semua bagian yang sudah dicoba telah mencapai target minimal 90%.');
  } else {
    insights.push('Belum ada riwayat latihan untuk lesson ini. Mulai dari Flashcard, Arti, atau Cara Baca.');
  }
  if (wrongReasons.length) {
    const top = wrongReasons[0];
    insights.push(`Penyebab salah terbanyak: ${WRONG_REASON_LABELS[top.reason] ?? top.reason} (${top.count}x / ${top.percentage}%).`);
  }
  if (hardQuestions.length) {
    const top = hardQuestions[0];
    insights.push(`Soal yang paling perlu diulang sudah salah ${top.wrong}x dengan akurasi ${top.accuracy}%.`);
  }

  return {
    overview: {
      totalAttempts: quizAttempts.length + flashAttempts.length,
      quizAttempts: quizAttempts.length,
      flashcardAttempts: flashAttempts.length,
      totalStudyDurationMs,
      accuracy: answers.length ? Math.round((answerCorrect / answers.length) * 100) : null,
      wrongAnswers: wrongAnswers.length,
      flashcardGoodRate: flashHistory.length ? Math.round((flashGood / flashHistory.length) * 100) : null,
    },
    progress,
    wrongReasons,
    recentHistory,
    recentMistakes,
    hardQuestions,
    insights,
  };
}
