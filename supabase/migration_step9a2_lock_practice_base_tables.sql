-- =====================================================================
-- MIGRATION: Step 9A-2 Lock Practice Base Tables & Authoritative Progress
-- Target:     Supabase / PostgreSQL
-- Purpose:    1. Completely remove direct anon and learner SELECT on base
--                questions and question_options.
--                (Learners and guests must use v_practice_questions and v_practice_question_options)
--             2. Restrict base questions and question_options to Admin only.
--             3. Lock direct learner mutation of practice & progress tables:
--                - practice_sessions (Learner SELECT own, Admin CRUD, mutations via RPC)
--                - question_attempts (Learner SELECT own, Admin CRUD, mutations via RPC)
--                - lesson_type_progress (Learner SELECT own, Admin CRUD, mutations via RPC)
--                - lesson_progress (Learner SELECT own, Admin CRUD, mutations via trigger/RPC)
--                - mistake_logs (Learner SELECT own, Admin CRUD, mutations via RPC)
--
-- PREREQUISITE: Must be executed ONLY AFTER Step 8 code has been updated
--               to query v_practice_questions instead of base questions.
--
-- Safety:     Atomic transaction (BEGIN...COMMIT), non-destructive, zero CASCADE.
-- Status:     PROPOSAL ONLY — DO NOT EXECUTE AUTOMATICALLY.
-- =====================================================================

begin;

-- =====================================================================
-- 1. REVOKE BASE TABLE PRIVILEGES FROM ANON & PUBLIC
-- Guests access safe content only through v_practice_questions & v_practice_question_options
-- =====================================================================

revoke all privileges on public.questions from public, anon;
revoke all privileges on public.question_options from public, anon;

grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.question_options to authenticated;


-- =====================================================================
-- 2. LOCK BASE QUESTIONS & QUESTION_OPTIONS POLICIES (ADMIN ONLY)
-- Normal authenticated learners receive 0 rows from base tables via RLS.
-- =====================================================================

drop policy if exists questions_select_authenticated on public.questions;
drop policy if exists questions_select_anon on public.questions;
drop policy if exists questions_admin_write on public.questions;
drop policy if exists questions_admin_all on public.questions;

create policy questions_admin_all on public.questions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists options_select_authenticated on public.question_options;
drop policy if exists options_select_anon on public.question_options;
drop policy if exists options_admin_write on public.question_options;
drop policy if exists question_options_admin_all on public.question_options;

create policy question_options_admin_all on public.question_options
for all to authenticated
using (public.is_admin())
with check (public.is_admin());


-- =====================================================================
-- 3. LOCK DIRECT LEARNER MUTATION ON PRACTICE & PROGRESS TABLES
-- Learners retain SELECT permissions on their own records for dashboard
-- and progress history, while all INSERT/UPDATE/DELETE operations by
-- learners are blocked and MUST go through authoritative RPCs.
-- =====================================================================

-- 3a. Practice Sessions
drop policy if exists sessions_own_or_admin on public.practice_sessions;
drop policy if exists practice_sessions_select_own_or_admin on public.practice_sessions;
drop policy if exists practice_sessions_admin_write on public.practice_sessions;

create policy practice_sessions_select_own_or_admin on public.practice_sessions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy practice_sessions_admin_write on public.practice_sessions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3b. Question Attempts
drop policy if exists attempts_own_or_admin on public.question_attempts;
drop policy if exists question_attempts_select_own_or_admin on public.question_attempts;
drop policy if exists question_attempts_admin_write on public.question_attempts;

create policy question_attempts_select_own_or_admin on public.question_attempts
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy question_attempts_admin_write on public.question_attempts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3c. Lesson Type Progress
drop policy if exists lesson_type_progress_own_or_admin on public.lesson_type_progress;
drop policy if exists lesson_type_progress_select_own_or_admin on public.lesson_type_progress;
drop policy if exists lesson_type_progress_admin_write on public.lesson_type_progress;

create policy lesson_type_progress_select_own_or_admin on public.lesson_type_progress
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy lesson_type_progress_admin_write on public.lesson_type_progress
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3d. Lesson Progress
drop policy if exists lesson_progress_own_or_admin on public.lesson_progress;
drop policy if exists lesson_progress_select_own_or_admin on public.lesson_progress;
drop policy if exists lesson_progress_admin_write on public.lesson_progress;

create policy lesson_progress_select_own_or_admin on public.lesson_progress
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy lesson_progress_admin_write on public.lesson_progress
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3e. Mistake Logs
drop policy if exists mistakes_own_or_admin on public.mistake_logs;
drop policy if exists mistake_logs_select_own_or_admin on public.mistake_logs;
drop policy if exists mistake_logs_admin_write on public.mistake_logs;

create policy mistake_logs_select_own_or_admin on public.mistake_logs
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy mistake_logs_admin_write on public.mistake_logs
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
