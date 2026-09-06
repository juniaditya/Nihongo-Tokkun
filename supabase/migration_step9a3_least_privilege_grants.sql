-- =====================================================================
-- MIGRATION: Step 9A-3 Least-Privilege Table Grants Hardening
-- Target:     Supabase / PostgreSQL
-- Purpose:    1. Strip excessive table-level privileges (TRUNCATE, TRIGGER,
--                REFERENCES) from the authenticated role on practice and progress tables.
--             2. Restrict authenticated privileges to strict CRUD only
--                (SELECT, INSERT, UPDATE, DELETE).
--             3. Preserve RLS policies as the primary authorization barrier.
--
-- Safety:     Atomic transaction (BEGIN...COMMIT), non-destructive, zero CASCADE.
-- Idempotent: Yes.
-- Status:     RECORD OF LIVE APPLIED MIGRATION.
-- =====================================================================

begin;

-- =====================================================================
-- 1. QUESTIONS & QUESTION_OPTIONS
-- (Base tables restricted to Admin only via RLS, learners use safe views)
-- =====================================================================

revoke all privileges on public.questions from authenticated;
grant select, insert, update, delete on public.questions to authenticated;

revoke all privileges on public.question_options from authenticated;
grant select, insert, update, delete on public.question_options to authenticated;


-- =====================================================================
-- 2. PRACTICE SESSIONS & ATTEMPTS
-- (Mutations authoritative via RPCs, SELECT own via RLS)
-- =====================================================================

revoke all privileges on public.practice_sessions from authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;

revoke all privileges on public.question_attempts from authenticated;
grant select, insert, update, delete on public.question_attempts to authenticated;


-- =====================================================================
-- 3. PROGRESS & MISTAKE LOGS
-- (Mutations authoritative via RPCs/triggers, SELECT own via RLS)
-- =====================================================================

revoke all privileges on public.lesson_type_progress from authenticated;
grant select, insert, update, delete on public.lesson_type_progress to authenticated;

revoke all privileges on public.lesson_progress from authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;

revoke all privileges on public.mistake_logs from authenticated;
grant select, insert, update, delete on public.mistake_logs to authenticated;

commit;
