-- =====================================================================
-- MIGRATION: Step 9A-1 Practice Safe Engine & Infrastructure (Hardened)
-- Target:     Supabase / PostgreSQL
-- Purpose:    1. Learner safe views (v_practice_questions, v_practice_question_options)
--                with strict guest-access checks (auth.uid() IS NOT NULL OR is_guest_accessible)
--             2. Add snapshot columns to practice_sessions:
--                - passing_grade_percent numeric(6,2)
--                - passed boolean
--                - time_limit_seconds_snapshot integer
--             3. DB-level integrity constraints & partial unique indexes:
--                - UNIQUE(session_id, question_id) on question_attempts
--                - Partial UNIQUE(user_id, lesson_id, section) WHERE completed_at IS NULL on practice_sessions
--                - Partial UNIQUE(question_id) WHERE is_correct = true on question_options
--                - UNIQUE(attempt_id) on mistake_logs
--             4. Authoritative practice RPCs (SECURITY DEFINER, auth.uid() derived):
--                - start_practice_session() (with concurrency-safe race handling & timer snapshot)
--                - submit_practice_answer() (with FOR UPDATE lock, timer expiry check, attempt count guard, correct option validation & attempt retry idempotency)
--                - finalize_practice_session() (with user+lesson advisory lock, immutable snapshot storage, strict denominator validation, grade validation & atomic fail reset)
--                - log_mistake_reason() (with preset/Lainnya validation, attempt ownership & upsert idempotency)
--             5. Idempotent seed for mistake_reason_presets
--
-- IMPORTANT:  This phase PRESERVES existing base-table SELECT policies on
--             questions and question_options so Step 8 remains 100% operational
--             while safe views are deployed. Base tables will be locked in Step 9A-2.
--
-- Safety:     Atomic transaction (BEGIN...COMMIT), non-destructive, zero CASCADE.
-- Status:     PROPOSAL ONLY — DO NOT EXECUTE AUTOMATICALLY.
-- =====================================================================

begin;

-- =====================================================================
-- 1. LEARNER SAFE VIEWS (QUESTIONS & OPTIONS)
-- Projects only safe public metadata. Excludes is_correct and explanations.
-- Strict guest security: anonymous users can ONLY access questions/options
-- when parent lesson has is_guest_accessible = true.
-- =====================================================================

create or replace view public.v_practice_questions
with (security_invoker = false)
as
select
  q.id,
  q.lesson_id,
  q.question_type,
  q.question_text,
  q.sort_order,
  q.passage_id
from public.questions q
join public.lessons l on l.id = q.lesson_id
where q.is_active = true
  and l.is_active = true
  and (
    auth.uid() is not null
    or l.is_guest_accessible = true
  );

revoke all privileges on public.v_practice_questions from public, anon, authenticated;
grant select on public.v_practice_questions to anon, authenticated;

create or replace view public.v_practice_question_options
with (security_invoker = false)
as
select
  qo.id,
  qo.question_id,
  qo.option_text,
  qo.option_order
from public.question_options qo
join public.questions q on q.id = qo.question_id
join public.lessons l on l.id = q.lesson_id
where q.is_active = true
  and l.is_active = true
  and (
    auth.uid() is not null
    or l.is_guest_accessible = true
  );

revoke all privileges on public.v_practice_question_options from public, anon, authenticated;
grant select on public.v_practice_question_options to anon, authenticated;


-- =====================================================================
-- 2. SNAPSHOT COLUMNS ON PRACTICE_SESSIONS
-- Stores immutable finalization and timer snapshot data for historical stability.
-- =====================================================================

alter table public.practice_sessions
  add column if not exists passing_grade_percent numeric(6,2),
  add column if not exists passed boolean,
  add column if not exists time_limit_seconds_snapshot integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'practice_sessions_passing_grade_check'
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_passing_grade_check
      check (
        passing_grade_percent is null
        or (passing_grade_percent > 0 and passing_grade_percent <= 100)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'practice_sessions_time_limit_snapshot_check'
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_time_limit_snapshot_check
      check (
        time_limit_seconds_snapshot is null
        or time_limit_seconds_snapshot > 0
      );
  end if;
end $$;


-- =====================================================================
-- 3. INTEGRITY CONSTRAINTS & PARTIAL UNIQUE INDEXES
-- =====================================================================

-- 3a. Prevent duplicate attempts to same question in a session
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'question_attempts_session_question_unique'
  ) then
    alter table public.question_attempts
      add constraint question_attempts_session_question_unique
      unique (session_id, question_id);
  end if;
end $$;

-- 3b. Prevent duplicate open/unfinished sessions for same user + lesson + section
create unique index if not exists idx_practice_sessions_open_unique
on public.practice_sessions (user_id, lesson_id, section)
where completed_at is null;

-- 3c. Enforce at most one correct option per question
create unique index if not exists idx_question_options_single_correct
on public.question_options (question_id)
where is_correct = true;

-- 3d. Enforce at most one mistake log per attempt
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mistake_logs_attempt_id_unique'
  ) then
    alter table public.mistake_logs
      add constraint mistake_logs_attempt_id_unique
      unique (attempt_id);
  end if;
end $$;


-- =====================================================================
-- 4. RPC: START PRACTICE SESSION (CONCURRENCY-IDEMPOTENT + TIMER SNAPSHOT)
-- =====================================================================

create or replace function public.start_practice_session(
  p_lesson_id uuid,
  p_question_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson record;
  v_total_questions integer;
  v_existing_session record;
  v_session_id uuid;
  v_started_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- 1. Verify lesson exists and is active
  select id, category, time_limit_seconds, is_active into v_lesson
  from public.lessons
  where id = p_lesson_id and is_active = true;

  if not found then
    raise exception 'Lesson not found or inactive';
  end if;

  -- 2. Fast check for existing open session
  select id, started_at, total_questions, time_limit_seconds_snapshot into v_existing_session
  from public.practice_sessions
  where user_id = v_user_id
    and lesson_id = p_lesson_id
    and section = p_question_type
    and completed_at is null
  limit 1;

  if found then
    return jsonb_build_object(
      'session_id', v_existing_session.id,
      'already_existing', true,
      'started_at', v_existing_session.started_at,
      'total_questions', v_existing_session.total_questions,
      'time_limit_seconds', v_existing_session.time_limit_seconds_snapshot
    );
  end if;

  -- 3. Calculate authoritative question count snapshot
  select count(*) into v_total_questions
  from public.questions
  where lesson_id = p_lesson_id
    and question_type = p_question_type
    and is_active = true;

  if v_total_questions = 0 then
    raise exception 'No active questions found for question_type: % in lesson: %', p_question_type, p_lesson_id;
  end if;

  -- 4. Insert new session with race-condition exception catch (Concurrency-safe)
  begin
    insert into public.practice_sessions (
      user_id,
      lesson_id,
      category,
      section,
      total_questions,
      time_limit_seconds_snapshot,
      correct_answers,
      score,
      passing_grade_percent,
      passed,
      started_at,
      completed_at
    )
    values (
      v_user_id,
      p_lesson_id,
      v_lesson.category,
      p_question_type,
      v_total_questions,
      v_lesson.time_limit_seconds,
      0,
      null,
      null,
      null,
      v_started_at,
      null
    )
    returning id into v_session_id;

    return jsonb_build_object(
      'session_id', v_session_id,
      'already_existing', false,
      'started_at', v_started_at,
      'total_questions', v_total_questions,
      'time_limit_seconds', v_lesson.time_limit_seconds
    );
  exception when unique_violation then
    -- Concurrent insert raced, safely load the winning unfinished session
    select id, started_at, total_questions, time_limit_seconds_snapshot into v_existing_session
    from public.practice_sessions
    where user_id = v_user_id
      and lesson_id = p_lesson_id
      and section = p_question_type
      and completed_at is null
    limit 1;

    if found then
      return jsonb_build_object(
        'session_id', v_existing_session.id,
        'already_existing', true,
        'started_at', v_existing_session.started_at,
        'total_questions', v_existing_session.total_questions,
        'time_limit_seconds', v_existing_session.time_limit_seconds_snapshot
      );
    else
      raise exception 'Could not start or resume practice session';
    end if;
  end;
end;
$$;

revoke all on function public.start_practice_session(uuid, text) from public, anon;
grant execute on function public.start_practice_session(uuid, text) to authenticated;


-- =====================================================================
-- 5. RPC: SUBMIT PRACTICE ANSWER (SERIALIZED, TIMER CHECK, ATTEMPT GUARD, VALIDATION & RETRY)
-- =====================================================================

create or replace function public.submit_practice_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid,
  p_response_time_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_question record;
  v_selected_option record;
  v_correct_option record;
  v_existing_attempt record;
  v_attempt_count integer;
  v_is_correct boolean;
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_response_time_ms is not null and p_response_time_ms < 0 then
    p_response_time_ms := 0;
  end if;

  -- 1. Lock and validate practice session (Serializes against finalize_practice_session)
  select id, user_id, lesson_id, section, total_questions, time_limit_seconds_snapshot, started_at, completed_at
  into v_session
  from public.practice_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Practice session not found';
  end if;

  if v_session.user_id != v_user_id then
    raise exception 'Unauthorized session access';
  end if;

  if v_session.completed_at is not null then
    raise exception 'Cannot submit answer to an already completed session';
  end if;

  -- 2. Server-authoritative timer enforcement
  if v_session.time_limit_seconds_snapshot is not null then
    if now() > v_session.started_at + (v_session.time_limit_seconds_snapshot || ' seconds')::interval then
      raise exception 'Practice session time limit exceeded';
    end if;
  end if;

  -- 3. Validate question belongs to session lesson & section
  select id, lesson_id, question_type, explanation, is_active into v_question
  from public.questions
  where id = p_question_id;

  if not found or not v_question.is_active then
    raise exception 'Question not found or inactive';
  end if;

  if v_question.lesson_id != v_session.lesson_id or v_question.question_type != v_session.section then
    raise exception 'Question does not match session lesson or question_type';
  end if;

  -- 4. Idempotent attempt check (Network retry protection with strict validation)
  select id, is_correct, selected_option_id into v_existing_attempt
  from public.question_attempts
  where session_id = p_session_id and question_id = p_question_id;

  if found then
    select id, explanation into v_correct_option
    from public.question_options
    where question_id = p_question_id and is_correct = true
    limit 1;

    if not found or v_correct_option.id is null then
      raise exception 'Question configuration invalid';
    end if;

    select explanation into v_selected_option.explanation
    from public.question_options
    where id = v_existing_attempt.selected_option_id;

    return jsonb_build_object(
      'attempt_id', v_existing_attempt.id,
      'is_correct', v_existing_attempt.is_correct,
      'already_answered', true,
      'question_explanation', v_question.explanation,
      'selected_option_explanation', v_selected_option.explanation,
      'correct_option_id', v_correct_option.id,
      'correct_option_explanation', v_correct_option.explanation
    );
  end if;

  -- 5. Attempt count guard: prevent answering more questions than session denominator snapshot
  select count(*) into v_attempt_count
  from public.question_attempts
  where session_id = p_session_id;

  if v_attempt_count >= v_session.total_questions then
    raise exception 'All questions for this session have already been answered';
  end if;

  -- 6. Validate selected option belongs to question
  select id, question_id, is_correct, explanation into v_selected_option
  from public.question_options
  where id = p_selected_option_id and question_id = p_question_id;

  if not found then
    raise exception 'Selected option does not belong to question';
  end if;

  v_is_correct := v_selected_option.is_correct;

  -- 7. Validate that a correct option exists for this question
  select id, explanation into v_correct_option
  from public.question_options
  where question_id = p_question_id and is_correct = true
  limit 1;

  if not found or v_correct_option.id is null then
    raise exception 'Question configuration invalid';
  end if;

  -- 8. Insert attempt (atomic)
  insert into public.question_attempts (
    session_id,
    user_id,
    question_id,
    selected_option_id,
    is_correct,
    answered_at,
    response_time_ms
  )
  values (
    p_session_id,
    v_user_id,
    p_question_id,
    p_selected_option_id,
    v_is_correct,
    now(),
    p_response_time_ms
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'is_correct', v_is_correct,
    'already_answered', false,
    'question_explanation', v_question.explanation,
    'selected_option_explanation', v_selected_option.explanation,
    'correct_option_id', v_correct_option.id,
    'correct_option_explanation', v_correct_option.explanation
  );
end;
$$;

revoke all on function public.submit_practice_answer(uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.submit_practice_answer(uuid, uuid, uuid, integer) to authenticated;


-- =====================================================================
-- 6. RPC: FINALIZE PRACTICE SESSION (SERIALIZED PER USER+LESSON, SNAPSHOT & ATOMIC RESET)
-- =====================================================================

create or replace function public.finalize_practice_session(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_total_questions integer;
  v_correct_answers integer;
  v_score numeric(6,2);
  v_passing_grade numeric(6,2);
  v_passed boolean;
  v_existing_prog record;
  v_new_best_score numeric;
  v_completed_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- 1. Fetch & lock session row (Serializes against submit_practice_answer)
  select id, user_id, lesson_id, category, section, total_questions, correct_answers, score, passing_grade_percent, passed, completed_at
  into v_session
  from public.practice_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Practice session not found';
  end if;

  if v_session.user_id != v_user_id then
    raise exception 'Unauthorized session access';
  end if;

  -- 2. Transaction-scoped advisory lock: serializes concurrent section finalizations for same user + lesson
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':' || v_session.lesson_id::text,
      0
    )
  );

  -- 3. Stable Idempotency Check: if already completed, return STORED SNAPSHOT directly
  -- (Does NOT re-read current app_config, does NOT re-evaluate progress, does NOT modify streak)
  if v_session.completed_at is not null then
    return jsonb_build_object(
      'session_id', v_session.id,
      'already_completed', true,
      'total_questions', v_session.total_questions,
      'correct_answers', v_session.correct_answers,
      'score', v_session.score,
      'passing_grade_percent', v_session.passing_grade_percent,
      'passed', v_session.passed,
      'completed_at', v_session.completed_at
    );
  end if;

  -- 4. Strict denominator validation: must be authoritative snapshot > 0
  if v_session.total_questions is null or v_session.total_questions <= 0 then
    raise exception 'Invalid practice session question count';
  end if;
  v_total_questions := v_session.total_questions;

  -- 5. Parse and validate passing grade from app_config with safe fallback (90)
  begin
    select value::numeric into v_passing_grade
    from public.app_config
    where key = 'passing_grade_percent';
  exception when others then
    v_passing_grade := 90.00;
  end;

  if v_passing_grade is null or v_passing_grade <= 0 or v_passing_grade > 100 then
    v_passing_grade := 90.00;
  end if;

  -- 6. Count correct answers from attempts for this session
  select count(*) into v_correct_answers
  from public.question_attempts
  where session_id = p_session_id and is_correct = true;

  -- 7. Calculate score percentage and pass/fail status
  v_score := round((v_correct_answers::numeric / v_total_questions::numeric) * 100.0, 2);
  v_passed := (v_score >= v_passing_grade);

  -- 8. Update practice_sessions with authoritative snapshot (triggers trg_practice_sessions_streak -> fn_update_streak)
  update public.practice_sessions
  set correct_answers = v_correct_answers,
      score = v_score,
      passing_grade_percent = v_passing_grade,
      passed = v_passed,
      completed_at = v_completed_at
  where id = p_session_id;

  -- 9. Update lesson_type_progress & atomic failure reset (protected by pg_advisory_xact_lock)
  select best_score, attempts_count into v_existing_prog
  from public.lesson_type_progress
  where user_id = v_user_id and lesson_id = v_session.lesson_id and question_type = v_session.section;

  v_new_best_score := greatest(coalesce(v_existing_prog.best_score, 0), v_score);

  if v_passed then
    -- PASS: upsert passed = true, increment attempts_count, update best_score
    insert into public.lesson_type_progress (
      user_id,
      lesson_id,
      question_type,
      best_score,
      passed,
      attempts_count,
      last_attempt_at
    )
    values (
      v_user_id,
      v_session.lesson_id,
      v_session.section,
      v_new_best_score,
      true,
      coalesce(v_existing_prog.attempts_count, 0) + 1,
      v_completed_at
    )
    on conflict (user_id, lesson_id, question_type) do update
      set best_score = excluded.best_score,
          passed = true,
          attempts_count = lesson_type_progress.attempts_count + 1,
          last_attempt_at = excluded.last_attempt_at;
  else
    -- FAIL:
    -- a. Update current attempted type with attempts_count + 1 and preserved best_score
    insert into public.lesson_type_progress (
      user_id,
      lesson_id,
      question_type,
      best_score,
      passed,
      attempts_count,
      last_attempt_at
    )
    values (
      v_user_id,
      v_session.lesson_id,
      v_session.section,
      v_new_best_score,
      false,
      coalesce(v_existing_prog.attempts_count, 0) + 1,
      v_completed_at
    )
    on conflict (user_id, lesson_id, question_type) do update
      set best_score = excluded.best_score,
          passed = false,
          attempts_count = lesson_type_progress.attempts_count + 1,
          last_attempt_at = excluded.last_attempt_at;

    -- b. ATOMIC RESET: reset all other question_types in this lesson to passed = false, preserving their best_score
    update public.lesson_type_progress
    set passed = false
    where user_id = v_user_id
      and lesson_id = v_session.lesson_id
      and question_type != v_session.section;
  end if;

  return jsonb_build_object(
    'session_id', p_session_id,
    'already_completed', false,
    'total_questions', v_total_questions,
    'correct_answers', v_correct_answers,
    'score', v_score,
    'passing_grade_percent', v_passing_grade,
    'passed', v_passed,
    'completed_at', v_completed_at
  );
end;
$$;

revoke all on function public.finalize_practice_session(uuid) from public, anon;
grant execute on function public.finalize_practice_session(uuid) to authenticated;


-- =====================================================================
-- 7. RPC: LOG MISTAKE REASON (STRICT VALIDATION + UPSERT IDEMPOTENCY)
-- =====================================================================

create or replace function public.log_mistake_reason(
  p_attempt_id uuid,
  p_reason text,
  p_custom_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt record;
  v_cleaned_reason text;
  v_cleaned_custom text;
  v_preset_exists boolean;
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_cleaned_reason := trim(p_reason);
  if v_cleaned_reason is null or v_cleaned_reason = '' then
    raise exception 'Mistake reason is required';
  end if;

  -- Reason validation: preset vs 'Lainnya'
  if v_cleaned_reason = 'Lainnya' then
    v_cleaned_custom := trim(p_custom_reason);
    if v_cleaned_custom is null or v_cleaned_custom = '' then
      raise exception 'Custom mistake reason is required when selecting "Lainnya"';
    end if;
    if length(v_cleaned_custom) > 500 then
      raise exception 'Custom mistake reason exceeds maximum length of 500 characters';
    end if;
  else
    select exists (
      select 1 from public.mistake_reason_presets
      where label = v_cleaned_reason and is_active = true
    ) into v_preset_exists;

    if not v_preset_exists then
      raise exception 'Invalid mistake reason preset: %', v_cleaned_reason;
    end if;

    v_cleaned_custom := null;
  end if;

  -- Verify attempt belongs to caller and was incorrect (strict is_correct = false check)
  select id, user_id, is_correct into v_attempt
  from public.question_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'Question attempt not found';
  end if;

  if v_attempt.user_id != v_user_id then
    raise exception 'Unauthorized attempt access';
  end if;

  if v_attempt.is_correct is not false then
    raise exception 'Cannot log mistake for a non-incorrect attempt';
  end if;

  -- Idempotent upsert: allows learner to update their selected reason
  insert into public.mistake_logs (
    attempt_id,
    user_id,
    reason,
    custom_reason,
    created_at
  )
  values (
    p_attempt_id,
    v_user_id,
    v_cleaned_reason,
    v_cleaned_custom,
    now()
  )
  on conflict (attempt_id) do update
    set reason = excluded.reason,
        custom_reason = excluded.custom_reason
  returning id into v_log_id;

  return jsonb_build_object(
    'mistake_log_id', v_log_id,
    'attempt_id', p_attempt_id,
    'success', true
  );
end;
$$;

revoke all on function public.log_mistake_reason(uuid, text, text) from public, anon;
grant execute on function public.log_mistake_reason(uuid, text, text) to authenticated;


-- =====================================================================
-- 8. SEED MISTAKE REASON PRESETS (IDEMPOTENT)
-- =====================================================================

insert into public.mistake_reason_presets (label, sort_order, is_active)
select v.label, v.sort_order, true
from (values
  ('Salah baca kanji', 1),
  ('Lupa arti kata', 2),
  ('Salah pakai grammar', 3),
  ('Terburu-buru / ceroboh', 4),
  ('Tidak paham konteks kalimat', 5)
) as v(label, sort_order)
where not exists (
  select 1 from public.mistake_reason_presets p where p.label = v.label
);

commit;
