-- =====================================================================
-- MIGRATION: Public Lesson Catalog View
-- Target:    Supabase / PostgreSQL
-- Purpose:   Create v_public_lesson_catalog to allow guest (anon) users
--            to see ALL lesson catalog metadata (locked + unlocked),
--            enabling the frontend to render locked/unlocked UI states
--            without weakening the raw lessons table RLS policy.
-- Safety:    Non-destructive. Creates/replaces a VIEW only.
--            Does NOT alter any table, existing RLS policy, or existing
--            grant on any base table.
-- Idempotent: Yes (DROP VIEW IF EXISTS + CREATE OR REPLACE VIEW).
-- =====================================================================

-- Drop existing view if it exists from a previous attempt (idempotent)
drop view if exists public.v_public_lesson_catalog;

-- =====================================================================
-- The view projects ONLY catalog metadata. It deliberately excludes:
--   - question_text, question_options, answers (no content exposure)
--   - kotoba, bunpou, dokkai_passages content (protected by base RLS)
--   - lesson_progress, lesson_type_progress, user_streaks (user-owned)
--   - description (verbose; not needed for catalog list rendering)
--   - created_at, updated_at (metadata noise)
--
-- security_invoker = false:
--   The view runs as the definer. This is intentional and correct because
--   the view itself is the security boundary — it projects only safe
--   metadata columns from lessons where is_active = true.
--   Content tables retain their own RLS policies independently.
-- =====================================================================
create or replace view public.v_public_lesson_catalog
with (security_invoker = false)
as
select
  l.id,
  l.course_id,
  l.category,
  l.number,
  l.title,
  l.is_guest_accessible,
  l.time_limit_seconds,
  l.sort_order
from public.lessons l
where l.is_active = true;

-- =====================================================================
-- Grants: SELECT only, to anon and authenticated.
-- Revoke any prior grants first to ensure a clean state.
-- =====================================================================
revoke all on public.v_public_lesson_catalog from anon, authenticated;
grant select on public.v_public_lesson_catalog to anon;
grant select on public.v_public_lesson_catalog to authenticated;

-- =====================================================================
-- Verification (run manually in Supabase SQL editor after applying):
-- =====================================================================
-- select
--   count(*)                                                    as total_lessons,
--   sum(case when is_guest_accessible then 1 else 0 end)       as guest_accessible_count,
--   count(distinct course_id)                                   as course_count,
--   count(distinct category)                                    as category_count
-- from public.v_public_lesson_catalog;
