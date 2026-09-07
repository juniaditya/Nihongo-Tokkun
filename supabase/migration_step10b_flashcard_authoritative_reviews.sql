-- =====================================================================
-- STEP 10B: AUTHORITATIVE FLASHCARD / SRS REVIEWS & SECURITY HARDENING (REVISED)
-- =====================================================================
-- Target:    Supabase PostgreSQL
-- Purpose:   1. Add nullable request_id & unique idempotency index to flashcard_reviews.
--            2. Provide server-authoritative submit_flashcard_review() RPC with:
--               - Deterministic two-phase concurrency locks (request-id then state-lock)
--               - Strict idempotency payload conflict detection
--               - Authentic historical review response on retry
--               - Server-authoritative review_count & timestamp calculation
--            3. Encapsulate scheduling formula via calculate_flashcard_next_review()
--               (internal only; revoked from public/anon/authenticated).
--            4. Retire legacy sync trigger to establish single authoritative source of truth.
--            5. Harden RLS & table grants (SELECT only for authenticated learners & admins;
--               all mutations occur exclusively via authoritative RPC).
-- Safety:    100% Non-destructive. Preserves all 576 historical reviews & 165 states.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. NON-DESTRUCTIVE SCHEMA EXTENSION: IDEMPOTENCY KEY
-- =====================================================================

ALTER TABLE public.flashcard_reviews
  ADD COLUMN IF NOT EXISTS request_id uuid;

-- Unique partial index guarantees idempotency for new review submissions
-- while leaving all 576 historical reviews (where request_id IS NULL) intact.
CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcard_reviews_user_request_id
  ON public.flashcard_reviews (user_id, request_id)
  WHERE request_id IS NOT NULL;


-- =====================================================================
-- 2. RETIRE LEGACY MIRROR TRIGGER
-- Single source of truth: RPC atomically writes reviews and updates states.
-- =====================================================================

DROP TRIGGER IF EXISTS trg_flashcard_reviews_sync_state ON public.flashcard_reviews;
DROP TRIGGER IF EXISTS trg_flashcard_reviews_sync ON public.flashcard_reviews;


-- =====================================================================
-- 3. ISOLATED SCHEDULING HELPER (INTERNAL FUNCTION)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calculate_flashcard_next_review(
  p_rating text,
  p_review_count integer,
  p_reviewed_at timestamptz
)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Historical audit confirmed 100% of historical next_review_at values were NULL.
  -- PRD Section 9 specifies that all cards in a unit appear every lesson session,
  -- and next_review_at is informational only without daily review limits.
  -- This helper encapsulates interval calculation so scheduling rules can be updated
  -- cleanly in the future without altering security, RPC, or concurrency plumbing.
  RETURN NULL;
END;
$$;


-- =====================================================================
-- 4. AUTHORITATIVE REVIEW RPC: submit_flashcard_review
-- =====================================================================

CREATE OR REPLACE FUNCTION public.submit_flashcard_review(
  p_flashcard_id uuid,
  p_rating text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rating text;
  v_now timestamptz := clock_timestamp();
  v_flashcard record;
  v_lesson record;
  v_existing_review record;
  v_current_state record;
  v_next_review_count integer;
  v_next_review_at timestamptz;
  v_review_id uuid;
BEGIN
  -- 1. Validate Authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  -- 2. Validate Request ID (Idempotency Key)
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request ID (idempotency key) is required' USING errcode = '22023';
  END IF;

  -- 3. Validate & Normalize Rating (Strictly 'again' or 'good' for MVP)
  v_rating := lower(trim(p_rating));
  IF v_rating NOT IN ('again', 'good') THEN
    RAISE EXCEPTION 'Invalid rating: "%". Must be "again" or "good".', p_rating USING errcode = '22023';
  END IF;

  -- 4. Validate Flashcard Parameter
  IF p_flashcard_id IS NULL THEN
    RAISE EXCEPTION 'Flashcard ID is required' USING errcode = '22023';
  END IF;

  -- 5. Concurrency Lock Phase 1: Lock Request ID
  -- Serializes identical request_id concurrent submissions per user to prevent race conditions.
  PERFORM pg_advisory_xact_lock(hashtext('flashcard_request'), hashtext(v_user_id::text || '_' || p_request_id::text));

  -- 6. Idempotency Check: Lookup existing review for this user & request_id
  SELECT id, flashcard_id, rating, reviewed_at, next_review_at, review_count
  INTO v_existing_review
  FROM public.flashcard_reviews
  WHERE user_id = v_user_id AND request_id = p_request_id;

  IF FOUND THEN
    -- Validate Payload Consistency: Key must not be reused for a different card or rating
    IF v_existing_review.flashcard_id != p_flashcard_id OR lower(trim(v_existing_review.rating)) != v_rating THEN
      RAISE EXCEPTION 'Idempotency key reused with different payload' USING errcode = '23505';
    END IF;

    -- Return the authoritative historical review response for this original request
    RETURN jsonb_build_object(
      'success', true,
      'already_reviewed', true,
      'review_id', v_existing_review.id,
      'flashcard_id', v_existing_review.flashcard_id,
      'rating', v_existing_review.rating,
      'review_count', v_existing_review.review_count,
      'reviewed_at', v_existing_review.reviewed_at,
      'next_review_at', v_existing_review.next_review_at
    );
  END IF;

  -- 7. Validate Flashcard Exists and Active
  SELECT id, lesson_id, kotoba_id, bunpou_id, is_active
  INTO v_flashcard
  FROM public.flashcards
  WHERE id = p_flashcard_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flashcard not found' USING errcode = 'P0002';
  END IF;

  IF NOT v_flashcard.is_active THEN
    RAISE EXCEPTION 'Flashcard is inactive' USING errcode = 'P0003';
  END IF;

  -- 8. Validate Lesson Exists and Active
  SELECT id, is_active, is_guest_accessible
  INTO v_lesson
  FROM public.lessons
  WHERE id = v_flashcard.lesson_id;

  IF NOT FOUND OR NOT v_lesson.is_active THEN
    RAISE EXCEPTION 'Lesson is not active or not found' USING errcode = 'P0003';
  END IF;

  -- 9. Concurrency Lock Phase 2: Lock Flashcard State
  -- Deterministic order: request-id lock (acquired in Step 5) -> flashcard-state lock (acquired here).
  PERFORM pg_advisory_xact_lock(hashtext('flashcard_review'), hashtext(v_user_id::text || '_' || p_flashcard_id::text));

  -- 10. Server-Authoritative State & Review Count Calculation
  SELECT review_count, last_rating, last_reviewed_at, next_review_at
  INTO v_current_state
  FROM public.flashcard_states
  WHERE user_id = v_user_id AND flashcard_id = p_flashcard_id
  FOR UPDATE;

  IF FOUND AND v_current_state.review_count IS NOT NULL THEN
    v_next_review_count := v_current_state.review_count + 1;
  ELSE
    v_next_review_count := 1;
  END IF;

  -- Calculate server-authoritative next_review_at via isolated helper
  v_next_review_at := public.calculate_flashcard_next_review(v_rating, v_next_review_count, v_now);

  -- 11. Insert Review History Log
  INSERT INTO public.flashcard_reviews (
    user_id,
    flashcard_id,
    rating,
    reviewed_at,
    next_review_at,
    review_count,
    request_id
  ) VALUES (
    v_user_id,
    p_flashcard_id,
    v_rating,
    v_now,
    v_next_review_at,
    v_next_review_count,
    p_request_id
  )
  RETURNING id INTO v_review_id;

  -- 12. Upsert Flashcard State Snapshot
  INSERT INTO public.flashcard_states (
    user_id,
    flashcard_id,
    last_rating,
    review_count,
    last_reviewed_at,
    next_review_at
  ) VALUES (
    v_user_id,
    p_flashcard_id,
    v_rating,
    v_next_review_count,
    v_now,
    v_next_review_at
  )
  ON CONFLICT (user_id, flashcard_id) DO UPDATE SET
    last_rating = EXCLUDED.last_rating,
    review_count = EXCLUDED.review_count,
    last_reviewed_at = EXCLUDED.last_reviewed_at,
    next_review_at = EXCLUDED.next_review_at;

  -- 13. Return Authoritative Result
  RETURN jsonb_build_object(
    'success', true,
    'already_reviewed', false,
    'review_id', v_review_id,
    'flashcard_id', p_flashcard_id,
    'rating', v_rating,
    'review_count', v_next_review_count,
    'reviewed_at', v_now,
    'next_review_at', v_next_review_at
  );
END;
$$;


-- =====================================================================
-- 5. RLS POLICY HARDENING
-- Clean SELECT-only policies for own-or-admin.
-- Direct learner and admin client-level mutations are not permitted;
-- mutations occur strictly via submit_flashcard_review() RPC.
-- =====================================================================

-- 5a. flashcard_reviews policies
DROP POLICY IF EXISTS reviews_own_or_admin ON public.flashcard_reviews;
DROP POLICY IF EXISTS flashcard_reviews_select_own_or_admin ON public.flashcard_reviews;
DROP POLICY IF EXISTS flashcard_reviews_admin_all ON public.flashcard_reviews;

CREATE POLICY flashcard_reviews_select_own_or_admin ON public.flashcard_reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 5b. flashcard_states policies
DROP POLICY IF EXISTS flashcard_states_own_or_admin ON public.flashcard_states;
DROP POLICY IF EXISTS flashcard_states_select_own_or_admin ON public.flashcard_states;
DROP POLICY IF EXISTS flashcard_states_admin_all ON public.flashcard_states;

CREATE POLICY flashcard_states_select_own_or_admin ON public.flashcard_states
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());


-- =====================================================================
-- 6. LEAST-PRIVILEGE GRANTS
-- =====================================================================

-- Table privileges for anonymous role: strictly ZERO
REVOKE ALL PRIVILEGES ON TABLE public.flashcard_reviews FROM anon, public;
REVOKE ALL PRIVILEGES ON TABLE public.flashcard_states FROM anon, public;

-- Table privileges for authenticated role: SELECT ONLY (no direct INSERT/UPDATE/DELETE)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.flashcard_reviews FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.flashcard_states FROM authenticated;

GRANT SELECT ON TABLE public.flashcard_reviews TO authenticated;
GRANT SELECT ON TABLE public.flashcard_states TO authenticated;

-- Internal helper: strictly internal execution (revoked from public, anon, and authenticated)
REVOKE ALL ON FUNCTION public.calculate_flashcard_next_review(text, integer, timestamptz) FROM public, anon, authenticated;

-- Public entrypoint RPC: execution granted to authenticated learners
REVOKE ALL ON FUNCTION public.submit_flashcard_review(uuid, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_flashcard_review(uuid, text, uuid) TO authenticated;

COMMIT;
