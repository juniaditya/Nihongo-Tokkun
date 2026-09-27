import { getSupabaseClient } from "@/server/supabase/client";
import { getRuntimeUsername } from "@/server/runtimeUser";
import { applyFsrsReview, type FsrsStateInput } from "@/lib/fsrs";
import type { FlashAttemptSubmission } from "@/lib/runtimeDtos";

function writesEnabled() {
  return String(process.env.ENABLE_PERSONAL_WRITES || '').toLowerCase() === 'true';
}

function toPrevious(row: Record<string, unknown>): FsrsStateInput {
  return {
    cardId: String(row.card_id),
    sourceType: String(row.source_type) as FsrsStateInput['sourceType'],
    sourceKategori: String(row.source_kategori),
    sourceNomor: Number(row.source_nomor) || 1,
    sourceBagian: String(row.source_bagian),
    firstReviewedAt: String(row.first_reviewed_at),
    lastReviewedAt: String(row.last_reviewed_at),
    dueAt: String(row.due_at),
    stability: Number(row.stability),
    difficulty: Number(row.difficulty),
    fsrsState: String(row.fsrs_state) as FsrsStateInput['fsrsState'],
    learningStep: row.learning_step == null ? null : Number(row.learning_step),
    reviewCount: Number(row.review_count) || 0,
    goodCount: Number(row.good_count) || 0,
    againCount: Number(row.again_count) || 0,
    lapseCount: Number(row.lapse_count) || 0,
    lastRating: Number(row.last_rating) as 1 | 3,
    stateVersion: Number(row.state_version) || 1,
  };
}

export async function POST(request: Request) {
  if (!writesEnabled()) {
    return Response.json({ ok: false, error: 'WRITE_DISABLED', message: 'Set ENABLE_PERSONAL_WRITES=true only for a protected personal deployment.' }, { status: 503 });
  }
  try {
    const payload = await request.json() as FlashAttemptSubmission;
    const username = await getRuntimeUsername();
    const categories = new Set(['kotoba', 'bunpou', 'review_kotoba']);
    if (!payload?.clientAttemptKey || !Array.isArray(payload.reviews) || payload.reviews.length === 0 || !categories.has(String(payload.kategori)) || Number(payload.nomor) < 1) {
      return Response.json({ ok: false, error: 'INVALID_PAYLOAD' }, { status: 400 });
    }
    const cardIds = payload.reviews.map((r) => String(r.cardId || '').trim());
    if (cardIds.some((id) => !id) || new Set(cardIds).size !== cardIds.length) {
      return Response.json({ ok: false, error: 'DUPLICATE_OR_BLANK_CARD_ID' }, { status: 400 });
    }

    const good = payload.reviews.filter((r) => r.result === 'Good').length;
    const again = payload.reviews.filter((r) => r.result === 'Again').length;
    if (good + again !== payload.reviews.length) {
      return Response.json({ ok: false, error: 'INVALID_RATING' }, { status: 400 });
    }

    const sb = getSupabaseClient();

    // Ownership/content validation is server-side. Never trust client-provided
    // source metadata for official course cards or Review Kotoba.
    if (payload.kategori === 'kotoba' || payload.kategori === 'bunpou') {
      const { data: validCards, error: validErr } = await sb
        .from('flashcards')
        .select('source_id, lessons!inner(category, lesson_number)')
        .in('source_id', cardIds)
        .eq('lessons.category', payload.kategori)
        .eq('lessons.lesson_number', Number(payload.nomor) || 1);
      if (validErr) throw new Error(validErr.message);
      const validIds = new Set((validCards ?? []).map((row) => String(row.source_id)));
      if (validIds.size !== cardIds.length || cardIds.some((id) => !validIds.has(id))) {
        return Response.json({ ok: false, error: 'CARD_NOT_IN_LESSON' }, { status: 400 });
      }
    }

    const attemptId = `att-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const pAttempt = {
      attempt_id: attemptId,
      username,
      started_at: payload.startedAt,
      completed_at: payload.completedAt,
      duration_ms: Math.max(0, Number(payload.durationMs) || 0),
      kategori: payload.kategori,
      nomor: Number(payload.nomor) || 1,
      bagian: payload.bagian || 'latihan',
      total_kartu: payload.reviews.length,
      good,
      again,
      skor: Math.round((good / payload.reviews.length) * 100),
      client_attempt_key: payload.clientAttemptKey,
    };
    const pReviews = payload.reviews.map((r) => ({
      card_id: r.cardId,
      result: r.result,
      response_time_ms: Math.max(0, Number(r.responseTimeMs) || 0),
      reviewed_at: r.reviewedAt,
    }));

    const isFsrsEligible = payload.kategori === 'kotoba' || payload.kategori === 'review_kotoba';
    if (isFsrsEligible) {
      const { data: stateRows, error: stateErr } = await sb
        .from('user_card_state')
        .select('card_id, source_type, source_kategori, source_nomor, source_bagian, first_reviewed_at, last_reviewed_at, due_at, stability, difficulty, fsrs_state, learning_step, review_count, good_count, again_count, lapse_count, last_rating, state_version')
        .eq('username', username)
        .in('card_id', cardIds);
      if (stateErr) throw new Error(stateErr.message);
      const existing = new Map<string, FsrsStateInput>();
      for (const row of stateRows ?? []) existing.set(String(row.card_id), toPrevious(row as Record<string, unknown>));

      if (payload.kategori === 'review_kotoba' && cardIds.some((id) => !existing.has(id))) {
        return Response.json({ ok: false, error: 'REVIEW_CARD_NOT_OWNED' }, { status: 400 });
      }

      const pCardStates = payload.reviews.map((review) => {
        const previous = existing.get(review.cardId) ?? null;
        const sourceType = payload.kategori === 'review_kotoba'
          ? previous!.sourceType
          : 'course_kotoba';
        const sourceKategori = payload.kategori === 'review_kotoba'
          ? previous!.sourceKategori
          : 'kotoba';
        const sourceNomor = payload.kategori === 'review_kotoba'
          ? previous!.sourceNomor
          : Number(payload.nomor) || 1;
        const sourceBagian = payload.kategori === 'review_kotoba'
          ? previous!.sourceBagian
          : payload.bagian || 'latihan';
        const next = applyFsrsReview(previous, {
          cardId: review.cardId,
          result: review.result,
          reviewedAt: review.reviewedAt,
          sourceType,
          sourceKategori,
          sourceNomor,
          sourceBagian,
        });
        return {
          card_id: next.cardId,
          expected_state_version: next.expectedStateVersion,
          source_type: next.sourceType,
          source_kategori: next.sourceKategori,
          source_nomor: next.sourceNomor,
          source_bagian: next.sourceBagian,
          first_reviewed_at: next.firstReviewedAt,
          last_reviewed_at: next.lastReviewedAt,
          due_at: next.dueAt,
          stability: next.stability,
          difficulty: next.difficulty,
          fsrs_state: next.fsrsState,
          learning_step: next.learningStep,
          review_count: next.reviewCount,
          good_count: next.goodCount,
          again_count: next.againCount,
          lapse_count: next.lapseCount,
          last_rating: next.lastRating,
        };
      });

      const { data, error } = await sb.rpc('save_flashcard_attempt_v3', {
        p_attempt: pAttempt,
        p_reviews: pReviews,
        p_card_states: pCardStates,
      });
      if (error) throw new Error(error.message);
      return Response.json(data ?? { ok: true, attemptId, totalKartu: payload.reviews.length, good, again, skor: pAttempt.skor });
    }

    // Bunpou flashcards are tracked as attempts/history but do not participate in
    // the current course_kotoba FSRS state machine.
    const { data: existingAttempt, error: existingErr } = await sb
      .from('flashcard_attempts')
      .select('attempt_id, total_kartu, good, again, skor')
      .eq('username', username)
      .eq('client_attempt_key', payload.clientAttemptKey)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (existingAttempt) return Response.json({ ok: true, duplicate: true, attemptId: existingAttempt.attempt_id, totalKartu: existingAttempt.total_kartu, good: existingAttempt.good, again: existingAttempt.again, skor: existingAttempt.skor });

    const { error: parentErr } = await sb.from('flashcard_attempts').insert(pAttempt);
    if (parentErr) throw new Error(parentErr.message);
    const { error: childErr } = await sb.from('flashcard_history').insert(pReviews.map((r) => ({ attempt_id: attemptId, ...r })));
    if (childErr) {
      await sb.from('flashcard_attempts').delete().eq('attempt_id', attemptId).eq('username', username);
      throw new Error(childErr.message);
    }
    return Response.json({ ok: true, duplicate: false, attemptId, totalKartu: payload.reviews.length, good, again, skor: pAttempt.skor });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'AUTH_REQUIRED') {
      return Response.json({ ok: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }
    if (message === 'PROFILE_NOT_LINKED') {
      return Response.json({ ok: false, error: 'PROFILE_NOT_LINKED' }, { status: 403 });
    }
    return Response.json({ ok: false, error: 'SAVE_FLASHCARD_FAILED', message }, { status: 500 });
  }
}
