// SERVER-ONLY MODULE
import 'server-only';

import { getSupabaseClient } from './client';
import { getLearningSummary } from './learning';
import type { DashboardSummary, LearningCategory } from '@/lib/types';

const BUNPOU_SECTIONS = ['arti_fungsi', 'bentuk_koneksi', 'perbedaan_grammar', 'penggunaan_kalimat'] as const;

function best(summary: Awaited<ReturnType<typeof getLearningSummary>>, cat: LearningCategory, nomor: number, section: string): number | null {
  const value = summary.completion.byDayBagian[`${cat}|${nomor}|${section}`]?.bestScore;
  return value == null ? null : Number(value);
}

/**
 * Dashboard payload mirroring the mature Apps Script dashboard, sourced only
 * from Supabase. The personal history scope comes from the authenticated runtime profile.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const sb = getSupabaseClient();
  const [learning, lessonsRes, questionsCnt, flashcardsCnt, passagesCnt] = await Promise.all([
    getLearningSummary(),
    sb.from('lessons').select('id, category, lesson_number'),
    sb.from('questions').select('*', { count: 'exact', head: true }),
    sb.from('flashcards').select('*', { count: 'exact', head: true }),
    sb.from('passages').select('*', { count: 'exact', head: true }),
  ]);

  if (lessonsRes.error) throw new Error(`[getDashboardSummary:lessons] ${lessonsRes.error.message}`);
  if (questionsCnt.error) throw new Error(`[getDashboardSummary:questions] ${questionsCnt.error.message}`);
  if (flashcardsCnt.error) throw new Error(`[getDashboardSummary:flashcards] ${flashcardsCnt.error.message}`);
  if (passagesCnt.error) throw new Error(`[getDashboardSummary:passages] ${passagesCnt.error.message}`);

  const lessons = (lessonsRes.data ?? []) as Array<{ id: string; category: LearningCategory; lesson_number: number }>;
  const lessonsByCategory = {
    kotoba: lessons.filter((l) => l.category === 'kotoba').length,
    bunpou: lessons.filter((l) => l.category === 'bunpou').length,
    dokkai: lessons.filter((l) => l.category === 'dokkai').length,
  };

  const mastery = {
    kotoba: { mastered: 0, total: lessonsByCategory.kotoba, percent: 0 },
    bunpou: { mastered: 0, total: lessonsByCategory.bunpou, percent: 0 },
    dokkai: { mastered: 0, total: lessonsByCategory.dokkai, percent: 0 },
  } satisfies DashboardSummary['categoryMastery'];

  for (const lesson of lessons) {
    if (lesson.category === 'kotoba') {
      const arti = best(learning, 'kotoba', lesson.lesson_number, 'arti');
      const reading = best(learning, 'kotoba', lesson.lesson_number, 'cara_baca');
      const mixed = best(learning, 'kotoba', lesson.lesson_number, 'mixed');
      const legacyMixedPassed = ['penggunaan', 'yohou', 'ruigigo']
        .every((section) => (best(learning, 'kotoba', lesson.lesson_number, section) ?? -1) >= 90);
      const mixedPassed = mixed != null ? mixed >= 90 : legacyMixedPassed;
      const mastered = (arti ?? -1) >= 90 && (reading ?? -1) >= 90 && mixedPassed;
      if (mastered) mastery.kotoba.mastered += 1;
    } else if (lesson.category === 'bunpou') {
      const values = BUNPOU_SECTIONS.map((section) => best(learning, 'bunpou', lesson.lesson_number, section)).filter((v): v is number => v != null);
      const flash = learning.completion.byFlashcardUnit[`bunpou|${lesson.lesson_number}`]?.bestScore;
      if (flash != null) values.push(Number(flash));
      if (values.length && Math.round(values.reduce((a, b) => a + b, 0) / values.length) >= 90) mastery.bunpou.mastered += 1;
    } else {
      const dokkai = best(learning, 'dokkai', lesson.lesson_number, 'sesi');
      if (dokkai != null && dokkai >= 90) mastery.dokkai.mastered += 1;
    }
  }

  (Object.keys(mastery) as LearningCategory[]).forEach((cat) => {
    mastery[cat].percent = mastery[cat].total ? Math.round((mastery[cat].mastered / mastery[cat].total) * 100) : 0;
  });

  return {
    ...learning,
    totalLessons: lessons.length,
    totalQuestions: questionsCnt.count ?? 0,
    totalFlashcards: flashcardsCnt.count ?? 0,
    totalPassages: passagesCnt.count ?? 0,
    lessonsByCategory,
    categoryMastery: mastery,
  };
}
