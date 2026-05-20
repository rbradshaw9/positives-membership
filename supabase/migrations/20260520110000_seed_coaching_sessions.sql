-- 20260520110000_seed_coaching_sessions.sql
--
-- Seeds a coach_profile for rbradshaw+coach@gmail.com and 3 test
-- coaching_booking rows (1 past, 1 upcoming, 1 today) for testing
-- the calendar and streaming flows.
--
-- Depends on:
--   - rbradshaw+coach@gmail.com member row existing
--   - rbradshaw+member@gmail.com (or closest match) member row existing
--   - coaching_session_packs migration having run
--
-- Safe to re-run: uses ON CONFLICT / IF NOT EXISTS throughout.

DO $$
DECLARE
  v_coach_member_id   uuid;
  v_member_id         uuid;
  v_coach_profile_id  uuid;
  v_pack_id           uuid;
  v_now               timestamptz := now();
BEGIN

  -- ── Resolve coach member ──────────────────────────────────────────────────
  SELECT id INTO v_coach_member_id
  FROM public.member
  WHERE email = 'rbradshaw+coach@gmail.com'
  LIMIT 1;

  IF v_coach_member_id IS NULL THEN
    RAISE NOTICE 'Coach member rbradshaw+coach@gmail.com not found — skipping seed.';
    RETURN;
  END IF;

  -- ── Resolve student member ────────────────────────────────────────────────
  -- Try rbradshaw+member first, fall back to any other rbradshaw account
  SELECT id INTO v_member_id
  FROM public.member
  WHERE email = 'rbradshaw+member@gmail.com'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    SELECT id INTO v_member_id
    FROM public.member
    WHERE email ILIKE '%rbradshaw%'
      AND email != 'rbradshaw+coach@gmail.com'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_member_id IS NULL THEN
    RAISE NOTICE 'No student member found — skipping seed.';
    RETURN;
  END IF;

  -- ── Create or find coach_profile ──────────────────────────────────────────
  SELECT id INTO v_coach_profile_id
  FROM public.coach_profile
  WHERE member_id = v_coach_member_id
  LIMIT 1;

  IF v_coach_profile_id IS NULL THEN
    INSERT INTO public.coach_profile (
      display_name, title, is_active, session_duration_minutes,
      buffer_minutes_after, routing_group, accepts_new, member_id
    ) VALUES (
      'Ryan Bradshaw (Coach)', 'Executive Coach', true, 60,
      15, 'default', true, v_coach_member_id
    )
    RETURNING id INTO v_coach_profile_id;

    RAISE NOTICE 'Created coach_profile id=%', v_coach_profile_id;
  ELSE
    RAISE NOTICE 'Using existing coach_profile id=%', v_coach_profile_id;
  END IF;

  -- ── Ensure a session pack for the student ─────────────────────────────────
  SELECT id INTO v_pack_id
  FROM public.coaching_session_pack
  WHERE member_id = v_member_id
    AND sessions_remaining > 0
  LIMIT 1;

  IF v_pack_id IS NULL THEN
    INSERT INTO public.coaching_session_pack (
      member_id, sessions_total, sessions_remaining, status, source
    ) VALUES (
      v_member_id, 3, 3, 'active', 'admin_grant'
    )
    RETURNING id INTO v_pack_id;

    RAISE NOTICE 'Created coaching_session_pack id=%', v_pack_id;
  END IF;

  -- ── Seed bookings ─────────────────────────────────────────────────────────
  -- 1. Completed session (2 days ago)
  INSERT INTO public.coaching_booking (
    member_id, coach_id, pack_id, status,
    scheduled_at, duration_minutes, timezone,
    member_intake, coach_notes
  )
  SELECT
    v_member_id, v_coach_profile_id, v_pack_id, 'completed',
    v_now - interval '2 days', 60, 'America/New_York',
    'Looking to work on clarity and focus for the quarter ahead.',
    'Great session. Member showed strong self-awareness. Follow up on goal-setting framework next session.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coaching_booking
    WHERE member_id = v_member_id AND coach_id = v_coach_profile_id
      AND status = 'completed'
  );

  -- 2. Upcoming session (tomorrow)
  INSERT INTO public.coaching_booking (
    member_id, coach_id, pack_id, status,
    scheduled_at, duration_minutes, timezone,
    member_intake
  )
  SELECT
    v_member_id, v_coach_profile_id, v_pack_id, 'confirmed',
    date_trunc('day', v_now + interval '1 day') + interval '10 hours', 60, 'America/New_York',
    'Checking in on action items from last session.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coaching_booking
    WHERE member_id = v_member_id AND coach_id = v_coach_profile_id
      AND status = 'confirmed'
      AND scheduled_at > v_now
  );

  -- 3. Session starting soon (30 minutes from now) — for streaming test
  INSERT INTO public.coaching_booking (
    member_id, coach_id, pack_id, status,
    scheduled_at, duration_minutes, timezone,
    member_intake
  )
  SELECT
    v_member_id, v_coach_profile_id, v_pack_id, 'confirmed',
    v_now + interval '30 minutes', 60, 'America/New_York',
    'Test session for streaming/calendar flow.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.coaching_booking
    WHERE member_id = v_member_id AND coach_id = v_coach_profile_id
      AND status = 'confirmed'
      AND scheduled_at BETWEEN v_now AND v_now + interval '1 hour'
  );

  RAISE NOTICE 'Coaching seed complete. coach_member=%, student_member=%, coach_profile=%',
    v_coach_member_id, v_member_id, v_coach_profile_id;

END $$;
