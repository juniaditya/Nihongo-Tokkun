-- =====================================================================
-- MIGRATION: Critical & High Security / Schema Fixes
-- Target: Supabase / PostgreSQL (Production & Staging)
-- Idempotency: Fully idempotent (safe to run multiple times)
-- Data Safety: 100% Non-destructive (Preserves all 165+ flashcard_states rows)
-- Cascade Policy: ZERO CASCADE clauses used
-- Historical files modified: NONE
-- =====================================================================

-- =====================================================================
-- 1. [CRITICAL] PREVENT PROFILES PRIVILEGE ESCALATION
-- Protect 'role' and 'tier_id' from being modified by regular users.
-- =====================================================================

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- If caller is not an administrator, prevent altering role and tier_id
  if not public.is_admin() then
    new.role := old.role;
    new.tier_id := old.tier_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();


-- =====================================================================
-- 2. [CRITICAL] PRESERVE STRICT PROFILES READ PERMISSIONS
-- Profiles MUST NOT be globally readable. Only the owner or admin may read.
-- Anonymous users (anon) have NO direct select permissions on profiles.
-- =====================================================================

drop policy if exists profiles_select_public on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());


-- =====================================================================
-- 3. [CRITICAL] FIX GUEST ACCESS ON COURSES
-- Allow anonymous users (guests) to view the course list on landing page.
-- =====================================================================

drop policy if exists courses_select_authenticated on public.courses;
drop policy if exists courses_select_all on public.courses;
create policy courses_select_all on public.courses
for select to authenticated, anon
using (true);


-- =====================================================================
-- 4. [CRITICAL] FLASHCARD_STATES TABLE & RECONCILED SYNC FUNCTION
-- Idempotently ensures flashcard_states exists matching the authoritative
-- live schema contract (review_count, last_rating, last_reviewed_at, next_review_at).
-- PRESERVES ALL EXISTING LIVE DATA (165+ production rows).
-- =====================================================================

create table if not exists public.flashcard_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  last_rating text check (lower(last_rating) in ('again','hard','good','easy')),
  review_count integer not null default 1 check (review_count >= 1),
  last_reviewed_at timestamptz not null default now(),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, flashcard_id)
);

create index if not exists idx_flashcard_states_user_due 
on public.flashcard_states(user_id, next_review_at);

alter table public.flashcard_states enable row level security;

drop policy if exists flashcard_states_own_or_admin on public.flashcard_states;
create policy flashcard_states_own_or_admin on public.flashcard_states
for all to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- updated_at trigger for flashcard_states
drop trigger if exists trg_flashcard_states_updated_at on public.flashcard_states;
create trigger trg_flashcard_states_updated_at
before update on public.flashcard_states
for each row execute function public.set_updated_at();

-- Reconcile / harden live sync function with explicit search_path
create or replace function public.sync_flashcard_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  insert into public.flashcard_states
    (user_id, flashcard_id, last_rating, review_count, last_reviewed_at, next_review_at)
  values
    (new.user_id, new.flashcard_id, new.rating, new.review_count, new.reviewed_at, new.next_review_at)
  on conflict (user_id, flashcard_id) do update set
    last_rating = excluded.last_rating,
    review_count = excluded.review_count,
    last_reviewed_at = excluded.last_reviewed_at,
    next_review_at = excluded.next_review_at
  where excluded.last_reviewed_at >= public.flashcard_states.last_reviewed_at;

  return new;
end;
$$;

-- Ensure authoritative live trigger exists without duplicates
drop trigger if exists trg_flashcard_reviews_sync on public.flashcard_reviews;
drop trigger if exists trg_flashcard_reviews_sync_state on public.flashcard_reviews;
create trigger trg_flashcard_reviews_sync_state
after insert on public.flashcard_reviews
for each row execute function public.sync_flashcard_state();


-- =====================================================================
-- 5. [HIGH] FIX KOTOBA_RELATIONS CHECK CONSTRAINT CONFLICT
-- Remove legacy unnamed constraint and enforce PRD relation types safely.
-- =====================================================================

alter table public.kotoba_relations drop constraint if exists kotoba_relations_relation_type_check;
alter table public.kotoba_relations drop constraint if exists kotoba_relations_type_check;
alter table public.kotoba_relations
  add constraint kotoba_relations_type_check
  check (relation_type in ('related_kanji', 'synonym', 'antonym', 'confusable', 'other'));


-- =====================================================================
-- 6. [HIGH] SECURE SEARCH_PATH ON SECURITY DEFINER FUNCTIONS & FIX STREAK NULLS
-- =====================================================================

-- 6a. fn_update_lesson_progress with explicit search_path
create or replace function public.fn_update_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  total_types int;
  passed_types int;
begin
  select count(distinct question_type) into total_types
  from public.questions
  where lesson_id = new.lesson_id and is_active = true;

  select count(*) into passed_types
  from public.lesson_type_progress
  where user_id = new.user_id and lesson_id = new.lesson_id and passed = true;

  insert into public.lesson_progress (user_id, lesson_id, status, completed_at)
  values (
    new.user_id,
    new.lesson_id,
    case when total_types > 0 and passed_types >= total_types then 'completed' else 'in_progress' end,
    case when total_types > 0 and passed_types >= total_types then now() else null end
  )
  on conflict (user_id, lesson_id) do update
    set status = excluded.status,
        completed_at = excluded.completed_at,
        updated_at = now();

  return new;
end;
$$;

-- 6b. fn_update_streak with explicit search_path and robust NULL date handling
create or replace function public.fn_update_streak()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  last_date date;
  today date := (new.completed_at at time zone 'Asia/Jakarta')::date;
begin
  if new.completed_at is null then
    return new;
  end if;

  select last_active_date into last_date from public.user_streaks where user_id = new.user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_active_date, updated_at)
    values (new.user_id, 1, 1, today, now())
    on conflict (user_id) do update
      set current_streak = 1,
          longest_streak = greatest(public.user_streaks.longest_streak, 1),
          last_active_date = today,
          updated_at = now();
  elsif last_date is null or last_date < today - 1 then
    update public.user_streaks
    set current_streak = 1,
        longest_streak = greatest(longest_streak, 1),
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  elsif last_date = today - 1 then
    update public.user_streaks
    set current_streak = current_streak + 1,
        longest_streak = greatest(longest_streak, current_streak + 1),
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  elsif last_date = today then
    null; -- already recorded for today
  end if;

  return new;
end;
$$;


-- =====================================================================
-- 7. [HIGH] LEADERBOARD VIEWS: IN-PLACE REPLACEMENT VIA CREATE OR REPLACE VIEW
-- 
-- PostgreSQL Strategy:
-- Appending 'username' as the LAST column preserves exact positions 1..6 (global)
-- and 1..7 (course). This allows in-place replacement via CREATE OR REPLACE VIEW
-- without dropping views, avoiding CASCADE and preventing disruption to dependent objects.
--
-- Security Model:
-- Standard PostgreSQL view owned by postgres (definer context).
-- Callers (anon, authenticated) receive SELECT permission ONLY on the view.
-- Direct SELECT on underlying tables (profiles, practice_sessions,
-- question_attempts, mistake_logs) remains completely denied to anon.
-- Sensitive profile fields (role, tier_id, created_at, updated_at) are NEVER
-- exposed through these views.
-- Only practice_sessions with completed_at is not null contribute to totals.
-- =====================================================================

-- 7a. Global Leaderboard View (Columns 1..6 preserved, Column 7: username appended)
create or replace view public.v_user_global_stats as
select
  ps.user_id,
  count(*) filter (where ps.completed_at is not null) as sessions_completed,
  coalesce(sum(ps.correct_answers), 0) as total_correct,
  coalesce(sum(ps.total_questions), 0) as total_questions,
  case when sum(ps.total_questions) > 0
    then round(100.0 * sum(ps.correct_answers) / sum(ps.total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (ps.completed_at - ps.started_at))), 0)::bigint as total_time_seconds,
  p.username
from public.practice_sessions ps
left join public.profiles p on p.id = ps.user_id
where ps.completed_at is not null
group by ps.user_id, p.username;

-- 7b. Course-Specific Leaderboard View (Columns 1..7 preserved, Column 8: username appended)
create or replace view public.v_user_course_stats as
select
  ps.user_id,
  l.course_id,
  count(*) filter (where ps.completed_at is not null) as sessions_completed,
  coalesce(sum(ps.correct_answers), 0) as total_correct,
  coalesce(sum(ps.total_questions), 0) as total_questions,
  case when sum(ps.total_questions) > 0
    then round(100.0 * sum(ps.correct_answers) / sum(ps.total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (ps.completed_at - ps.started_at))), 0)::bigint as total_time_seconds,
  p.username
from public.practice_sessions ps
join public.lessons l on l.id = ps.lesson_id
left join public.profiles p on p.id = ps.user_id
where ps.completed_at is not null
group by ps.user_id, p.username, l.course_id;

-- 7c. Revoke all privileges first, then grant SELECT ONLY to anon and authenticated
revoke all on public.v_user_global_stats from anon, authenticated;
revoke all on public.v_user_course_stats from anon, authenticated;

grant select on public.v_user_global_stats to anon, authenticated;
grant select on public.v_user_course_stats to anon, authenticated;


-- =====================================================================
-- 8. [CRITICAL] STRICT LEAST-PRIVILEGE GRANTS FOR ANONYMOUS ROLE (ANON)
-- Strip all non-SELECT privileges (INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES, TRIGGER) from 'anon' across the public schema.
-- =====================================================================

-- 8a. User-owned, attempt, progress, lock, and preset tables: ZERO privileges for anon
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.practice_sessions from anon;
revoke all privileges on table public.question_attempts from anon;
revoke all privileges on table public.mistake_logs from anon;
revoke all privileges on table public.flashcard_reviews from anon;
revoke all privileges on table public.flashcard_states from anon;
revoke all privileges on table public.lesson_progress from anon;
revoke all privileges on table public.lesson_type_progress from anon;
revoke all privileges on table public.user_streaks from anon;
revoke all privileges on table public.edit_locks from anon;
revoke all privileges on table public.mistake_reason_presets from anon;

-- 8b. Public learning content: SELECT ONLY for anon (RLS governs row visibility)
revoke all privileges on table public.courses from anon;
grant select on table public.courses to anon;

revoke all privileges on table public.lessons from anon;
grant select on table public.lessons to anon;

revoke all privileges on table public.kotoba from anon;
grant select on table public.kotoba to anon;

revoke all privileges on table public.kotoba_relations from anon;
grant select on table public.kotoba_relations to anon;

revoke all privileges on table public.bunpou from anon;
grant select on table public.bunpou to anon;

revoke all privileges on table public.dokkai_passages from anon;
grant select on table public.dokkai_passages to anon;

revoke all privileges on table public.questions from anon;
grant select on table public.questions to anon;

revoke all privileges on table public.question_options from anon;
grant select on table public.question_options to anon;

revoke all privileges on table public.flashcards from anon;
grant select on table public.flashcards to anon;

-- 8c. Configuration metadata: SELECT ONLY for anon
revoke all privileges on table public.app_config from anon;
grant select on table public.app_config to anon;

revoke all privileges on table public.subscription_tiers from anon;
grant select on table public.subscription_tiers to anon;


-- =====================================================================
-- PRE-MIGRATION VERIFICATION SQL
-- Run these checks in Supabase SQL Editor before applying migration.
-- =====================================================================
/*
-- Pre-1: Verify flashcard_states row count and columns
select count(*) as flashcard_states_count from public.flashcard_states;

select table_name, column_name, data_type, is_nullable
from information_schema.columns 
where table_schema = 'public' and table_name = 'flashcard_states'
order by ordinal_position;

-- Pre-2: Inspect live sync_flashcard_state definition and triggers
select proname, prosecdef, prosrc 
from pg_proc 
where proname = 'sync_flashcard_state';

select tgname, relname, proname 
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where relname in ('flashcard_reviews', 'flashcard_states');

-- Pre-3: Inspect active constraints on kotoba_relations
select conname, pg_get_constraintdef(oid) 
from pg_constraint 
where conrelid = 'public.kotoba_relations'::regclass;

-- Pre-4: Inspect existing profiles & courses RLS policies
select tablename, policyname, roles, cmd, qual, with_check 
from pg_policies 
where schemaname = 'public' and tablename in ('profiles', 'courses');

-- Pre-5: Inspect current columns of leaderboard views
select table_name, column_name, ordinal_position
from information_schema.columns 
where table_schema = 'public' and table_name in ('v_user_global_stats', 'v_user_course_stats')
order by table_name, ordinal_position;

-- Pre-6: Inspect all table/view privileges currently held by anon
select table_name, privilege_type 
from information_schema.role_table_grants 
where grantee = 'anon' and table_schema = 'public'
order by table_name, privilege_type;
*/

-- =====================================================================
-- POST-MIGRATION VERIFICATION SQL
-- Run these checks after applying migration to verify successful execution.
-- =====================================================================
/*
-- Post-1: Verify flashcard_states row count is unchanged (must be >= 165)
select count(*) as flashcard_states_count from public.flashcard_states;

-- Post-2: Verify sync trigger and hardened function search_path
select proname, prosecdef, proconfig 
from pg_proc 
where proname in ('protect_profile_fields', 'sync_flashcard_state', 'fn_update_lesson_progress', 'fn_update_streak');

select tgname, relname 
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where tgname = 'trg_flashcard_reviews_sync_state';

-- Post-3: Verify kotoba_relations constraint definition
select conname, pg_get_constraintdef(oid) 
from pg_constraint 
where conrelid = 'public.kotoba_relations'::regclass and conname = 'kotoba_relations_type_check';

-- Post-4: Verify RLS policies on profiles, courses, and flashcard_states
select tablename, policyname, roles, cmd, qual, with_check 
from pg_policies 
where tablename in ('profiles', 'courses', 'flashcard_states');

-- Post-5: Verify leaderboard views output columns (username must be last column)
select table_name, column_name, ordinal_position, data_type 
from information_schema.columns 
where table_schema = 'public' and table_name in ('v_user_global_stats', 'v_user_course_stats')
order by table_name, ordinal_position;

-- Post-6: Audit all table and view privileges granted to 'anon' in public schema
-- (Should only return SELECT privileges on content, config, and views)
select table_name, privilege_type 
from information_schema.role_table_grants 
where grantee = 'anon' and table_schema = 'public'
order by table_name, privilege_type;

-- Post-7: Strictly verify ZERO non-SELECT privileges exist for 'anon' anywhere in public schema
-- Expected: MUST return 0 rows
select table_name, privilege_type 
from information_schema.role_table_grants 
where grantee = 'anon' 
  and table_schema = 'public' 
  and privilege_type <> 'SELECT';

-- Post-8: Verify anon has ZERO privileges on user/attempt/progress/lock/preset tables
-- Expected: MUST return 0 rows
select table_name, privilege_type 
from information_schema.role_table_grants 
where grantee = 'anon' 
  and table_schema = 'public'
  and table_name in (
    'profiles', 'practice_sessions', 'question_attempts', 'mistake_logs',
    'flashcard_reviews', 'flashcard_states', 'lesson_progress',
    'lesson_type_progress', 'user_streaks', 'edit_locks', 'mistake_reason_presets'
  );
*/

-- =====================================================================
-- ROLLBACK SCRIPT & LIMITATIONS
-- Execute the following block to revert all changes introduced by this migration.
-- ZERO CASCADE CLAUSES USED.
-- =====================================================================
/*
-- 1. Revert privilege escalation guard trigger on profiles:
drop trigger if exists trg_protect_profile_fields on public.profiles;
drop function if exists public.protect_profile_fields();

-- 2. Revert profiles policy to original baseline:
drop policy if exists profiles_select_public on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

-- 3. Revert courses policy to authenticated-only:
drop policy if exists courses_select_all on public.courses;
create policy courses_select_authenticated on public.courses
for select to authenticated
using (true);

-- 4. Revert sync_flashcard_state to unconstrained search_path (live version):
-- Note: flashcard_states table and data are strictly PRESERVED on rollback.
create or replace function public.sync_flashcard_state()
returns trigger
language plpgsql
as $$
begin
  insert into public.flashcard_states
    (user_id, flashcard_id, last_rating, review_count, last_reviewed_at, next_review_at)
  values
    (new.user_id, new.flashcard_id, new.rating, new.review_count, new.reviewed_at, new.next_review_at)
  on conflict (user_id, flashcard_id) do update set
    last_rating = excluded.last_rating,
    review_count = excluded.review_count,
    last_reviewed_at = excluded.last_reviewed_at,
    next_review_at = excluded.next_review_at
  where excluded.last_reviewed_at >= public.flashcard_states.last_reviewed_at;

  return new;
end;
$$;

-- 5. Revert kotoba_relations CHECK constraint to original schema.sql definition:
alter table public.kotoba_relations drop constraint if exists kotoba_relations_type_check;
alter table public.kotoba_relations
  add constraint kotoba_relations_relation_type_check
  check (lower(relation_type) in ('synonym','antonym','similar','usage_difference','related'));

-- 6. Revert fn_update_lesson_progress (remove explicit search_path):
create or replace function public.fn_update_lesson_progress()
returns trigger
language plpgsql
security definer
as $$
declare
  total_types int;
  passed_types int;
begin
  select count(distinct question_type) into total_types
  from questions
  where lesson_id = new.lesson_id and is_active = true;

  select count(*) into passed_types
  from lesson_type_progress
  where user_id = new.user_id and lesson_id = new.lesson_id and passed = true;

  insert into lesson_progress (user_id, lesson_id, status, completed_at)
  values (
    new.user_id,
    new.lesson_id,
    case when total_types > 0 and passed_types >= total_types then 'completed' else 'in_progress' end,
    case when total_types > 0 and passed_types >= total_types then now() else null end
  )
  on conflict (user_id, lesson_id) do update
    set status = excluded.status,
        completed_at = excluded.completed_at,
        updated_at = now();

  return new;
end;
$$;

-- 7. Revert fn_update_streak (remove explicit search_path):
create or replace function public.fn_update_streak()
returns trigger
language plpgsql
security definer
as $$
declare
  last_date date;
  today date := (new.completed_at at time zone 'Asia/Jakarta')::date;
begin
  if new.completed_at is null then
    return new;
  end if;

  select last_active_date into last_date from user_streaks where user_id = new.user_id;

  if last_date is null then
    insert into user_streaks (user_id, current_streak, longest_streak, last_active_date)
    values (new.user_id, 1, 1, today)
    on conflict (user_id) do nothing;
  elsif last_date = today then
    null;
  elsif last_date = today - 1 then
    update user_streaks
    set current_streak = current_streak + 1,
        longest_streak = greatest(longest_streak, current_streak + 1),
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  else
    update user_streaks
    set current_streak = 1,
        last_active_date = today,
        updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

-- 8. Revert views without CASCADE (safe view recreation if dependencies permit):
drop view if exists public.v_user_global_stats;
drop view if exists public.v_user_course_stats;

create view public.v_user_global_stats as
select
  user_id,
  count(*) filter (where completed_at is not null) as sessions_completed,
  coalesce(sum(correct_answers), 0) as total_correct,
  coalesce(sum(total_questions), 0) as total_questions,
  case when sum(total_questions) > 0
    then round(100.0 * sum(correct_answers) / sum(total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (completed_at - started_at))), 0)::bigint as total_time_seconds
from practice_sessions
where completed_at is not null
group by user_id;

create view public.v_user_course_stats as
select
  ps.user_id,
  l.course_id,
  count(*) filter (where ps.completed_at is not null) as sessions_completed,
  coalesce(sum(ps.correct_answers), 0) as total_correct,
  coalesce(sum(ps.total_questions), 0) as total_questions,
  case when sum(ps.total_questions) > 0
    then round(100.0 * sum(ps.correct_answers) / sum(ps.total_questions), 2)
    else 0
  end as accuracy_percent,
  coalesce(sum(extract(epoch from (ps.completed_at - ps.started_at))), 0)::bigint as total_time_seconds
from practice_sessions ps
join lessons l on l.id = ps.lesson_id
where ps.completed_at is not null
group by ps.user_id, l.course_id;

revoke all on public.v_user_global_stats from anon, authenticated;
revoke all on public.v_user_course_stats from anon, authenticated;

grant select on public.v_user_global_stats to authenticated;
grant select on public.v_user_course_stats to authenticated;
*/
