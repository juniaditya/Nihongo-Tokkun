// SERVER-ONLY MODULE
import 'server-only';

import { getSupabaseClient } from './client';
import {
  HealthBaseline,
  PRODUCTION_BASELINE,
} from '@/lib/types';

export interface HealthCheckResult {
  ok: boolean;
  counts: {
    lessons: number;
    questions: number;
    questionOptions: number;
    flashcards: number;
    passages: number;
    attempts: number;
    flashcardAttempts: number;
  };
  baseline: HealthBaseline;
  deltas: Partial<Record<keyof HealthBaseline, number>>;
  errors: string[];
  durationMs: number;
}

async function countTable(
  table: string,
  errors: string[]
): Promise<number> {
  const sb = getSupabaseClient();
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    errors.push(`[${table}] ${error.message}`);
    return -1;
  }
  return count ?? 0;
}

/**
 * Queries row counts for all production tables and compares against
 * the Phase 6A verified baseline. Returns deltas (positive = more rows
 * than baseline, negative = fewer rows than baseline).
 *
 * This check is read-only and never mutates the database.
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const start = Date.now();
  const errors: string[] = [];

  const [
    lessons,
    questions,
    questionOptions,
    flashcards,
    passages,
    attempts,
    flashcardAttempts,
  ] = await Promise.all([
    countTable('lessons', errors),
    countTable('questions', errors),
    countTable('question_options', errors),
    countTable('flashcards', errors),
    countTable('passages', errors),
    countTable('attempts', errors),
    countTable('flashcard_attempts', errors),
  ]);

  const counts = {
    lessons,
    questions,
    questionOptions,
    flashcards,
    passages,
    attempts,
    flashcardAttempts,
  };

  const baseline = PRODUCTION_BASELINE;
  const deltas: Partial<Record<keyof HealthBaseline, number>> = {};

  for (const key of Object.keys(baseline) as (keyof HealthBaseline)[]) {
    const actual = counts[key];
    if (actual >= 0 && actual !== baseline[key]) {
      deltas[key] = actual - baseline[key];
    }
  }

  return {
    ok: errors.length === 0,
    counts,
    baseline,
    deltas,
    errors,
    durationMs: Date.now() - start,
  };
}
