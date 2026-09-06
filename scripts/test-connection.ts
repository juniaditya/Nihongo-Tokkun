import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import type { Database } from '../src/types/database.types';

// Load .env.local manually if present without external dotenv dependency
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export function isConfigured(): boolean {
  return (
    !!supabaseUrl &&
    !supabaseUrl.includes('placeholder-project.supabase.co') &&
    !!supabaseKey &&
    !supabaseKey.includes('placeholder-publishable-key')
  );
}

export async function runDiagnostics() {
  console.log('====================================================');
  console.log('SUPABASE CONNECTION & RLS TEST');
  console.log('====================================================');
  console.log(`URL: ${supabaseUrl || '(not configured)'}`);
  console.log(`Key: [CONFIGURED - MASKED] (length: ${supabaseKey.length})`);

  if (!isConfigured()) {
    console.error('\n[ERROR] Environment variables in .env.local are missing or placeholder values.');
    console.error('Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    return {
      success: false,
      reason: 'unconfigured_credentials',
    };
  }

  // Initialize unauthenticated / anon client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const results: Record<string, unknown> = {};

  // 1. Courses Table Test (Public SELECT)
  console.log('\n--- 1. Testing courses table (Public SELECT) ---');
  const { data: rawCourses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, level');
  const courses = rawCourses as Array<{ id: string; name: string; level: string | null }> | null;

  if (coursesError || !courses) {
    console.error('Courses query FAILED:', coursesError?.message);
    results.courses = { success: false, error: coursesError };
  } else {
    console.log(`Courses query SUCCESS. Retrieved ${courses.length} courses:`);
    courses.forEach((c) => console.log(`  - [${c.level ?? 'N/A'}] ${c.name} (${c.id})`));
    results.courses = { success: true, count: courses.length, data: courses };
  }

  // 2. Lessons Table Test (Guest RLS: is_guest_accessible = true)
  console.log('\n--- 2. Testing lessons table (Guest RLS filter) ---');
  const { data: rawLessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, course_id, title, is_guest_accessible');
  const lessons = rawLessons as Array<{
    id: string;
    course_id: string;
    title: string | null;
    is_guest_accessible: boolean;
  }> | null;

  if (lessonsError || !lessons) {
    console.error('Lessons query FAILED:', lessonsError?.message);
    results.lessons = { success: false, error: lessonsError };
  } else {
    const nonGuestLessons = lessons.filter((l) => !l.is_guest_accessible);
    const allGuestAccessible = nonGuestLessons.length === 0;
    console.log(`Lessons query SUCCESS. Retrieved ${lessons.length} accessible lessons.`);
    console.log(`All returned lessons are guest accessible: ${allGuestAccessible}`);
    if (!allGuestAccessible) {
      console.warn(`WARNING: Found ${nonGuestLessons.length} lessons where is_guest_accessible is FALSE!`);
    }
    results.lessons = {
      success: true,
      count: lessons.length,
      allGuestAccessible,
      data: lessons.slice(0, 5),
    };
  }

  // 3. Public Leaderboard Views
  console.log('\n--- 3. Testing v_user_global_stats view ---');
  const { data: globalStats, error: globalStatsError } = await supabase
    .from('v_user_global_stats')
    .select('user_id, sessions_completed, total_correct, total_questions, accuracy_percent, total_time_seconds, username')
    .limit(5);

  if (globalStatsError) {
    console.error('Global stats query FAILED:', globalStatsError.message);
    results.globalStats = { success: false, error: globalStatsError };
  } else {
    console.log(`Global stats query SUCCESS. Retrieved ${globalStats.length} rows.`);
    results.globalStats = { success: true, count: globalStats.length, sample: globalStats };
  }

  console.log('\n--- 4. Testing v_user_course_stats view ---');
  const { data: courseStats, error: courseStatsError } = await supabase
    .from('v_user_course_stats')
    .select('user_id, course_id, sessions_completed, total_correct, total_questions, accuracy_percent, total_time_seconds, username')
    .limit(5);

  if (courseStatsError) {
    console.error('Course stats query FAILED:', courseStatsError.message);
    results.courseStats = { success: false, error: courseStatsError };
  } else {
    console.log(`Course stats query SUCCESS. Retrieved ${courseStats.length} rows.`);
    results.courseStats = { success: true, count: courseStats.length, sample: courseStats };
  }

  // 4. Protected Tables (Anon Access Denial)
  console.log('\n--- 5. Testing protected user tables (Must be denied or return empty) ---');
  const protectedTables = ['profiles', 'practice_sessions', 'question_attempts', 'flashcard_states'] as const;

  const protectedResults: Record<string, unknown> = {};
  for (const table of protectedTables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.log(`Table '${table}': Access DENIED (${error.code || 'RLS'}): ${error.message}`);
      protectedResults[table] = { denied: true, errorCode: error.code, message: error.message };
    } else if (data && data.length === 0) {
      console.log(`Table '${table}': Access RESTRICTED by RLS (0 rows returned to anon).`);
      protectedResults[table] = { denied: true, rowsReturned: 0 };
    } else {
      console.warn(`WARNING: Table '${table}' returned ${data?.length} rows to anon user!`);
      protectedResults[table] = { denied: false, leakedRows: data?.length };
    }
  }
  results.protected = protectedResults;

  console.log('\n====================================================');
  console.log('CONNECTION TEST COMPLETE');
  console.log('====================================================');
  return { success: true, results };
}

if (require.main === module) {
  runDiagnostics().catch(console.error);
}
