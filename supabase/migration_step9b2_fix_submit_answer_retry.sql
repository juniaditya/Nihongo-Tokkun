-- =====================================================================
-- STEP 9B.2: FIX SUBMIT PRACTICE ANSWER RETRY & AUTHORITATIVE SELECTED OPTION
-- =====================================================================
-- Refactored sequence:
-- 1. auth.uid() validation
-- 2. Lock & validate session ownership
-- 3. Load question & validate lesson/question_type match
-- 4. Check existing attempt: if found, return authoritative stored result immediately
--    (allowed even if session finalized, timer expired, or question deactivated)
-- 5. If no existing attempt: enforce session active, timer not expired, question active,
--    attempt count guard, selected option validation, correct option validation & insert.

BEGIN;

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
  v_selected_option_explanation text;
  v_correct_option record;
  v_existing_attempt record;
  v_attempt_count integer;
  v_is_correct boolean;
  v_attempt_id uuid;
begin
  -- 1. Authentication validation
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_response_time_ms is not null and p_response_time_ms < 0 then
    p_response_time_ms := 0;
  end if;

  -- 2. Lock and validate practice session (Serializes against finalize_practice_session)
  select id, user_id, lesson_id, section, total_questions, time_limit_seconds_snapshot, started_at, completed_at
  into v_session
  from public.practice_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Practice session not found';
  end if;

  -- 3. Verify session ownership
  if v_session.user_id != v_user_id then
    raise exception 'Unauthorized session access';
  end if;

  -- 4. Load question and verify lesson & section match
  select id, lesson_id, question_type, explanation, is_active
  into v_question
  from public.questions
  where id = p_question_id;

  if not found then
    raise exception 'Question not found';
  end if;

  if v_question.lesson_id != v_session.lesson_id or v_question.question_type != v_session.section then
    raise exception 'Question does not match session lesson or question_type';
  end if;

  -- 5. Idempotent attempt check: if attempt already exists, return authoritative result immediately
  -- (Retrying an existing answer is valid even if session completed, timer expired, or question deactivated)
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

    select explanation into v_selected_option_explanation
    from public.question_options
    where id = v_existing_attempt.selected_option_id
      and question_id = p_question_id;

    return jsonb_build_object(
      'attempt_id', v_existing_attempt.id,
      'selected_option_id', v_existing_attempt.selected_option_id,
      'is_correct', v_existing_attempt.is_correct,
      'already_answered', true,
      'question_explanation', v_question.explanation,
      'selected_option_explanation', v_selected_option_explanation,
      'correct_option_id', v_correct_option.id,
      'correct_option_explanation', v_correct_option.explanation
    );
  end if;

  -- 6. New Attempt Path: Enforce session active & not completed
  if v_session.completed_at is not null then
    raise exception 'Cannot submit answer to an already completed session';
  end if;

  -- 7. New Attempt Path: Server-authoritative timer enforcement
  if v_session.time_limit_seconds_snapshot is not null then
    if now() > v_session.started_at + (v_session.time_limit_seconds_snapshot || ' seconds')::interval then
      raise exception 'Practice session time limit exceeded';
    end if;
  end if;

  -- 8. New Attempt Path: Validate question is currently active
  if not v_question.is_active then
    raise exception 'Question not found or inactive';
  end if;

  -- 9. New Attempt Path: Attempt count guard (prevent answering beyond session snapshot)
  select count(*) into v_attempt_count
  from public.question_attempts
  where session_id = p_session_id;

  if v_attempt_count >= v_session.total_questions then
    raise exception 'All questions for this session have already been answered';
  end if;

  -- 10. New Attempt Path: Validate selected option belongs to question
  select id, question_id, is_correct, explanation into v_selected_option
  from public.question_options
  where id = p_selected_option_id and question_id = p_question_id;

  if not found then
    raise exception 'Selected option does not belong to question';
  end if;

  v_is_correct := v_selected_option.is_correct;
  v_selected_option_explanation := v_selected_option.explanation;

  -- 11. New Attempt Path: Validate correct option exists
  select id, explanation into v_correct_option
  from public.question_options
  where question_id = p_question_id and is_correct = true
  limit 1;

  if not found or v_correct_option.id is null then
    raise exception 'Question configuration invalid';
  end if;

  -- 12. New Attempt Path: Insert attempt (atomic)
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
    'selected_option_id', p_selected_option_id,
    'is_correct', v_is_correct,
    'already_answered', false,
    'question_explanation', v_question.explanation,
    'selected_option_explanation', v_selected_option_explanation,
    'correct_option_id', v_correct_option.id,
    'correct_option_explanation', v_correct_option.explanation
  );
end;
$$;

revoke all on function public.submit_practice_answer(uuid, uuid, uuid, integer) from public, anon;
grant execute on function public.submit_practice_answer(uuid, uuid, uuid, integer) to authenticated;

COMMIT;
