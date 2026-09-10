-- Step 14: entitlement checks only. No historical data is rewritten.
begin;

create or replace function public.get_content_access(p_course_id uuid, p_lesson_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_level text;
  v_guest boolean;
  v_subscription public.user_subscriptions%rowtype;
begin
  select level into v_level from public.courses where id = p_course_id;
  if not found then return jsonb_build_object('allowed',false,'full_access',false,'reason','not_found'); end if;
  if public.is_admin() then return jsonb_build_object('allowed',true,'full_access',true,'reason',null); end if;
  if p_lesson_id is not null then
    select is_guest_accessible into v_guest from public.lessons
      where id=p_lesson_id and course_id=p_course_id and is_active;
    if not found then return jsonb_build_object('allowed',false,'full_access',false,'reason','not_found'); end if;
  else
    select exists(select 1 from public.lessons where course_id=p_course_id and is_active and is_guest_accessible) into v_guest;
  end if;
  select * into v_subscription from public.user_subscriptions where user_id=auth.uid();
  if auth.uid() is null or not found then
    return jsonb_build_object('allowed',coalesce(v_guest,false),'full_access',false,'reason',case when v_guest then null else 'subscription_required' end);
  end if;
  if v_subscription.expires_at < now() then
    return jsonb_build_object('allowed',false,'full_access',false,'reason','expired');
  end if;
  if v_subscription.started_at > now() then
    return jsonb_build_object('allowed',false,'full_access',false,'reason','not_started');
  end if;
  if v_subscription.plan_type='nihongo_regular' or
    (v_subscription.plan_type='jlpt_intensive' and v_subscription.jlpt_level=v_level) then
    return jsonb_build_object('allowed',true,'full_access',true,'reason',null);
  end if;
  return jsonb_build_object('allowed',false,'full_access',false,'reason','level_not_included','jlpt_level',v_subscription.jlpt_level);
end;
$$;

create or replace function public.can_user_access_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((select (public.get_content_access(l.course_id,l.id)->>'allowed')::boolean
    from public.lessons l where l.id=p_lesson_id),false);
$$;
revoke all on function public.get_content_access(uuid,uuid), public.can_user_access_lesson(uuid) from public;
grant execute on function public.get_content_access(uuid,uuid), public.can_user_access_lesson(uuid) to anon,authenticated;

-- Restrictive policies also constrain existing permissive policies, preserving admin writes.
create policy lessons_subscription_access on public.lessons as restrictive for select to authenticated
  using (public.can_user_access_lesson(id));
create policy kotoba_subscription_access on public.kotoba as restrictive for select to authenticated
  using (public.can_user_access_lesson(lesson_id));
create policy bunpou_subscription_access on public.bunpou as restrictive for select to authenticated
  using (public.can_user_access_lesson(lesson_id));
create policy passages_subscription_access on public.dokkai_passages as restrictive for select to authenticated
  using (public.can_user_access_lesson(lesson_id));
create policy flashcards_subscription_access on public.flashcards as restrictive for select to authenticated
  using (public.can_user_access_lesson(lesson_id));
create policy relations_subscription_access on public.kotoba_relations as restrictive for select to authenticated
  using (public.is_admin() or (exists(select 1 from public.kotoba k where k.id=kotoba_id)
    and exists(select 1 from public.kotoba k where k.id=related_kotoba_id)));

-- These owner-executed views must enforce entitlement explicitly.
create or replace view public.v_practice_questions with (security_invoker=false) as
select q.id,q.lesson_id,q.question_type,q.question_text,q.sort_order,q.passage_id
from public.questions q join public.lessons l on l.id=q.lesson_id
where q.is_active and l.is_active and public.can_user_access_lesson(l.id);
create or replace view public.v_practice_question_options with (security_invoker=false) as
select qo.id,qo.question_id,qo.option_text,qo.option_order
from public.question_options qo join public.questions q on q.id=qo.question_id
join public.lessons l on l.id=q.lesson_id
where q.is_active and l.is_active and public.can_user_access_lesson(l.id);

-- Preserve the exact live engine bodies. Fail closed if the reviewed definitions changed.
-- Insert one guard at the outer BEGIN, before retries, reads or writes.
do $migration$
declare r record; v_oid oid; v_body text; v_definition text;
begin
  for r in select * from (values
    ('start_practice_session(uuid,text)','3ed11786c70c677b2f6e4cdbb2fbce5b','p_lesson_id'),
    ('submit_practice_answer(uuid,uuid,uuid,integer)','3cc23eb586dcdaa95d9fcfd23f991a2f','(select lesson_id from public.practice_sessions where id=p_session_id and user_id=auth.uid())'),
    ('finalize_practice_session(uuid)','25b7d3b6e269236fcd7c1616e6cd169a','(select lesson_id from public.practice_sessions where id=p_session_id and user_id=auth.uid())'),
    ('log_mistake_reason(uuid,text,text)','8efcb10a3fc1d6c4d6dcc5937a62305c','(select q.lesson_id from public.question_attempts a join public.questions q on q.id=a.question_id where a.id=p_attempt_id and a.user_id=auth.uid())'),
    ('submit_flashcard_review(uuid,text,uuid)','0b5c3c86c206ba9c7a7ce3cabe059a80','(select lesson_id from public.flashcards where id=p_flashcard_id)')
  ) as expected(signature,body_md5,lesson_expression)
  loop
    v_oid:=to_regprocedure('public.'||r.signature);
    select prosrc into v_body from pg_proc where oid=v_oid;
    if v_oid is null or md5(v_body)<>r.body_md5 then
      raise exception 'Unreviewed live definition: %',r.signature;
    end if;
    v_definition:=pg_get_functiondef(v_oid);
    execute regexp_replace(v_definition,'\mbegin\M',
      'begin' || chr(10) || '  if auth.uid() is null or not public.can_user_access_lesson('||r.lesson_expression||') then raise exception ''Konten terkunci. Periksa paket Anda.'' using errcode=''42501''; end if;' || chr(10),'i');
  end loop;
end;
$migration$;

create or replace function public.get_lesson_mistakes(p_lesson_id uuid)
returns table(attempt_id uuid,question_text text,selected_answer text,correct_answer text,reason text,custom_reason text,answered_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select a.id,q.question_text,selected.option_text,
    (select o.option_text from public.question_options o where o.question_id=q.id and o.is_correct order by o.option_order limit 1),
    m.reason,m.custom_reason,a.answered_at
  from public.question_attempts a join public.questions q on q.id=a.question_id
  left join public.question_options selected on selected.id=a.selected_option_id
  left join public.mistake_logs m on m.attempt_id=a.id and m.user_id=auth.uid()
  where a.user_id=auth.uid() and a.is_correct=false and q.lesson_id=p_lesson_id
    and public.can_user_access_lesson(p_lesson_id)
  order by a.answered_at desc,a.id desc limit 10;
$$;
commit;
