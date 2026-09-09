-- Read only feedback for the caller's own incorrect attempts in one lesson.
begin;
create or replace function public.get_lesson_mistakes(p_lesson_id uuid)
returns table(attempt_id uuid, question_text text, selected_answer text, correct_answer text,
  reason text, custom_reason text, answered_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select a.id, q.question_text, selected.option_text,
    (select o.option_text from public.question_options o
     where o.question_id = q.id and o.is_correct order by o.option_order limit 1),
    m.reason, m.custom_reason, a.answered_at
  from public.question_attempts a
  join public.questions q on q.id = a.question_id
  left join public.question_options selected on selected.id = a.selected_option_id
  left join public.mistake_logs m on m.attempt_id = a.id and m.user_id = auth.uid()
  where a.user_id = auth.uid() and a.is_correct = false and q.lesson_id = p_lesson_id
  order by a.answered_at desc, a.id desc limit 10;
$$;
revoke all on function public.get_lesson_mistakes(uuid) from public, anon;
grant execute on function public.get_lesson_mistakes(uuid) to authenticated;
commit;
