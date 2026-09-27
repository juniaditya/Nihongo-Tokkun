import 'server-only';

import { getSupabaseClient } from './client';
import { getRuntimeUsername } from '@/server/runtimeUser';
import type { LearningCategory } from '@/lib/types';

import type { FlashcardSessionCard, FlashcardSessionData } from '@/lib/types';

function asObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text) out[key] = text;
  }
  return out;
}

function shuffle<T>(input: T[]): T[] {
  const rows = input.slice();
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

function kotobaBackFields(back: Record<string, string>) {
  return [
    { label: 'Cara Baca', value: back.hiragana ?? '' },
    { label: 'Arti', value: back.arti ?? '' },
    { label: 'Penjelasan', value: back.penjelasan ?? '' },
  ].filter((field) => field.value);
}

function bunpouBackFields(back: Record<string, string>) {
  return [
    { label: 'Bahasa Indonesia', value: back.arti ?? '' },
    { label: 'Fungsi', value: back.fungsi ?? '' },
    { label: 'Perbedaan Kunci', value: back.perbedaanKunci ?? '' },
    { label: 'Rumus', value: back.rumus ?? '' },
    { label: 'Contoh Kalimat', value: back.contohKalimat ?? '' },
  ].filter((field) => field.value);
}

export async function getFlashcardSessionForLesson(lessonId: string): Promise<FlashcardSessionData | null> {
  const sb = getSupabaseClient();
  const { data: lesson, error: lessonError } = await sb
    .from('lessons')
    .select('id, category, lesson_number, label')
    .eq('id', lessonId)
    .single();

  if (lessonError) {
    if (lessonError.code === 'PGRST116') return null;
    throw new Error(`[getFlashcardSessionForLesson:lesson] ${lessonError.message}`);
  }

  const category = String(lesson.category) as LearningCategory;
  if (category !== 'kotoba' && category !== 'bunpou') return null;

  const { data, error } = await sb
    .from('flashcards')
    .select('source_id, section, front, back')
    .eq('lesson_id', lessonId)
    .in('section', ['latihan', 'flashcard'])
    .order('source_id');
  if (error) throw new Error(`[getFlashcardSessionForLesson:cards] ${error.message}`);

  const cards: FlashcardSessionCard[] = (data ?? []).map((row) => {
    const front = asObject(row.front);
    const back = asObject(row.back);
    const sourceId = String(row.source_id);
    const frontText = front.depan ?? sourceId;
    const backFields = category === 'kotoba' ? kotobaBackFields(back) : bunpouBackFields(back);
    return {
      id: sourceId,
      front: frontText,
      reading: back.hiragana ?? null,
      meaning: back.arti ?? back.fungsi ?? '',
      detailExplanation: back.penjelasan ?? back.contohKalimat ?? null,
      backFields,
      sourceType: 'course_kotoba',
      sourceKategori: category,
      sourceNomor: Number(lesson.lesson_number) || 1,
      sourceBagian: String(row.section ?? 'latihan'),
    };
  });

  return {
    mode: 'lesson',
    lesson: {
      id: String(lesson.id),
      category,
      lessonNumber: Number(lesson.lesson_number) || 1,
      label: String(lesson.label ?? `${category} ${lesson.lesson_number}`),
    },
    cards: shuffle(cards),
  };
}

export async function getReviewFlashcardSession(): Promise<FlashcardSessionData> {
  const sb = getSupabaseClient();
  const username = await getRuntimeUsername();
  const nowIso = new Date().toISOString();

  const [{ data: dueStates, error: dueError }, { data: futureStates, error: futureError }] = await Promise.all([
    sb
      .from('user_card_state')
      .select('card_id, source_type, source_kategori, source_nomor, source_bagian, due_at, last_reviewed_at')
      .eq('username', username)
      .lte('due_at', nowIso)
      .order('due_at', { ascending: true })
      .order('last_reviewed_at', { ascending: true }),
    sb
      .from('user_card_state')
      .select('due_at')
      .eq('username', username)
      .gt('due_at', nowIso)
      .order('due_at', { ascending: true })
      .limit(1),
  ]);
  if (dueError) throw new Error(`[getReviewFlashcardSession:due] ${dueError.message}`);
  if (futureError) throw new Error(`[getReviewFlashcardSession:future] ${futureError.message}`);

  const states = dueStates ?? [];
  const courseIds = states.filter((s) => s.source_type === 'course_kotoba').map((s) => String(s.card_id));
  const userIds = states.filter((s) => s.source_type === 'user_kotoba').map((s) => String(s.card_id));

  const [courseResult, userResult] = await Promise.all([
    courseIds.length
      ? sb.from('flashcards').select('source_id, front, back').in('source_id', courseIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? sb.from('user_kotoba').select('card_id, kotoba, cara_baca, arti, penjelasan').eq('username', username).in('card_id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (courseResult.error) throw new Error(`[getReviewFlashcardSession:course] ${courseResult.error.message}`);
  if (userResult.error) throw new Error(`[getReviewFlashcardSession:user] ${userResult.error.message}`);

  const content = new Map<string, Omit<FlashcardSessionCard, 'sourceType' | 'sourceKategori' | 'sourceNomor' | 'sourceBagian' | 'dueAt'>>();
  for (const row of courseResult.data ?? []) {
    const front = asObject(row.front);
    const back = asObject(row.back);
    content.set(String(row.source_id), {
      id: String(row.source_id),
      front: front.depan ?? String(row.source_id),
      reading: back.hiragana ?? null,
      meaning: back.arti ?? '',
      detailExplanation: back.penjelasan ?? null,
      backFields: kotobaBackFields(back),
    });
  }
  for (const row of userResult.data ?? []) {
    content.set(String(row.card_id), {
      id: String(row.card_id),
      front: String(row.kotoba ?? ''),
      reading: String(row.cara_baca ?? '') || null,
      meaning: String(row.arti ?? ''),
      detailExplanation: String(row.penjelasan ?? '') || null,
      backFields: [
        { label: 'Cara Baca', value: String(row.cara_baca ?? '') },
        { label: 'Arti', value: String(row.arti ?? '') },
        { label: 'Penjelasan', value: String(row.penjelasan ?? '') },
      ].filter((field) => field.value),
    });
  }

  const cards: FlashcardSessionCard[] = [];
  for (const state of states) {
    const base = content.get(String(state.card_id));
    if (!base) continue;
    cards.push({
      ...base,
      sourceType: state.source_type as 'course_kotoba' | 'user_kotoba',
      sourceKategori: String(state.source_kategori),
      sourceNomor: Number(state.source_nomor) || 1,
      sourceBagian: String(state.source_bagian || 'latihan'),
      dueAt: String(state.due_at),
    });
  }

  return {
    mode: 'review',
    lesson: {
      id: null,
      category: 'review_kotoba',
      lessonNumber: 1,
      label: 'Review Kotoba',
    },
    cards,
    nextDueAt: futureStates?.[0]?.due_at ? String(futureStates[0].due_at) : null,
  };
}
