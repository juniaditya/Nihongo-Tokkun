import { getSupabaseClient } from "@/server/supabase/client";
import { getRuntimeUsername } from "@/server/runtimeUser";
import type { QuizAttemptSubmission } from "@/lib/runtimeDtos";

function writesEnabled() {
  return String(process.env.ENABLE_PERSONAL_WRITES || '').toLowerCase() === 'true';
}

export async function POST(request: Request) {
  if (!writesEnabled()) {
    return Response.json({ ok: false, error: 'WRITE_DISABLED', message: 'Set ENABLE_PERSONAL_WRITES=true only for a protected personal deployment.' }, { status: 503 });
  }

  try {
    const payload = await request.json() as QuizAttemptSubmission;
    const username = await getRuntimeUsername();
    const categories = new Set(['kotoba', 'bunpou', 'dokkai']);
    if (!payload?.clientAttemptKey || !Array.isArray(payload.answers) || payload.answers.length === 0 || !categories.has(String(payload.kategori)) || Number(payload.nomor) < 1) {
      return Response.json({ ok: false, error: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    const sourceIds = [...new Set(payload.answers.map((a) => String(a.questionSourceId || '').trim()).filter(Boolean))];
    if (sourceIds.length !== payload.answers.length) {
      return Response.json({ ok: false, error: 'DUPLICATE_OR_BLANK_QUESTION_ID' }, { status: 400 });
    }

    const sb = getSupabaseClient();
    const { data: questions, error: qErr } = await sb
      .from('questions')
      .select('source_id, section, lessons!inner(category, lesson_number), question_options(text, is_correct)')
      .in('source_id', sourceIds);
    if (qErr) throw new Error(qErr.message);

    const bySource = new Map<string, { section: string; options: Array<{ text: string; is_correct: boolean }> }>();
    for (const raw of questions ?? []) {
      const row = raw as unknown as {
        source_id: string;
        section: string;
        lessons?: { category?: string; lesson_number?: number } | Array<{ category?: string; lesson_number?: number }> | null;
        question_options: Array<{ text: string; is_correct: boolean }>;
      };
      const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
      if (lesson?.category !== payload.kategori || Number(lesson?.lesson_number) !== Number(payload.nomor)) {
        return Response.json({ ok: false, error: 'QUESTION_NOT_IN_LESSON' }, { status: 400 });
      }
      bySource.set(row.source_id, { section: row.section, options: row.question_options ?? [] });
    }
    if (bySource.size !== sourceIds.length) {
      return Response.json({ ok: false, error: 'QUESTION_NOT_FOUND' }, { status: 400 });
    }

    const sections = payload.answers.map((answer) => bySource.get(answer.questionSourceId)?.section ?? '');
    if (payload.kategori === 'kotoba' && payload.bagian === 'mixed') {
      const expected = ['penggunaan', 'yohou', 'ruigigo'];
      if (payload.answers.length !== 30 || expected.some((section) => sections.filter((value) => value === section).length !== 10)) {
        return Response.json({ ok: false, error: 'INVALID_MIXED_DISTRIBUTION' }, { status: 400 });
      }
    } else if (payload.kategori !== 'dokkai' && sections.some((section) => section !== payload.bagian)) {
      return Response.json({ ok: false, error: 'QUESTION_SECTION_MISMATCH' }, { status: 400 });
    }

    let benar = 0;
    const answers = payload.answers.map((answer, sessionIndex) => {
      const q = bySource.get(answer.questionSourceId)!;
      const selectedExists = q.options.some((o) => o.text === answer.selectedAnswer);
      const correct = q.options.find((o) => o.is_correct);
      if (!selectedExists || !correct) throw new Error(`INVALID_ANSWER:${answer.questionSourceId}`);
      const isCorrect = answer.selectedAnswer === correct.text;
      if (isCorrect) benar += 1;
      const allowedReasons = new Set(['lupa_arti', 'tidak_ngerti', 'buru_buru', 'terkecoh', 'salah_baca', 'lainnya']);
      const reason = String(answer.wrongReason || '');
      const reasonOther = String(answer.wrongReasonOther || '').trim();
      if (!isCorrect && (!allowedReasons.has(reason) || (reason === 'lainnya' && !reasonOther))) {
        throw new Error(`INVALID_WRONG_REASON:${answer.questionSourceId}`);
      }
      return {
        question_source_id: answer.questionSourceId,
        question_index: sessionIndex,
        is_correct: isCorrect,
        selected_answer: answer.selectedAnswer,
        correct_answer: correct.text,
        wrong_reason: isCorrect ? '' : reason,
        wrong_reason_other: isCorrect ? '' : reasonOther,
        response_time_ms: Math.max(0, Number(answer.responseTimeMs) || 0),
        answered_at: answer.answeredAt || payload.completedAt,
      };
    });

    const total = answers.length;
    const score = total ? Math.round((benar / total) * 100) : 0;
    const attemptId = `att-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const attempt = {
      attempt_id: attemptId,
      username,
      started_at: payload.startedAt,
      completed_at: payload.completedAt,
      duration_ms: Math.max(0, Number(payload.durationMs) || 0),
      kategori: payload.kategori,
      nomor: Number(payload.nomor),
      bagian: payload.bagian,
      total_soal: total,
      benar,
      salah: total - benar,
      skor: score,
      client_attempt_key: payload.clientAttemptKey,
    };

    const { data, error } = await sb.rpc('save_quiz_attempt_v3', { p_attempt: attempt, p_answers: answers });
    if (error) throw new Error(error.message);
    return Response.json(data ?? { ok: true, attemptId, totalSoal: total, benar, salah: total - benar, skor: score });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'AUTH_REQUIRED') {
      return Response.json({ ok: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }
    if (message === 'PROFILE_NOT_LINKED') {
      return Response.json({ ok: false, error: 'PROFILE_NOT_LINKED' }, { status: 403 });
    }
    return Response.json({ ok: false, error: 'SAVE_QUIZ_FAILED', message }, { status: 500 });
  }
}
