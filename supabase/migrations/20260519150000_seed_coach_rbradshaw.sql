-- Seed rbradshaw+coach@gmail.com as a Coach-role admin team member.
-- This is the first coach account for beta testing the coaching flow.
-- Depends on: the member record existing in auth.users / public.member.
-- Safe to re-run: ON CONFLICT DO NOTHING throughout.

DO $$
DECLARE
  v_member_id   uuid;
  v_coach_role  uuid;
BEGIN
  -- Resolve member ID from email
  SELECT id INTO v_member_id
  FROM public.member
  WHERE email = 'rbradshaw+coach@gmail.com'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE NOTICE 'Coach member rbradshaw+coach@gmail.com not found — skipping seed. Create the member account first.';
    RETURN;
  END IF;

  -- Resolve the coach role ID
  SELECT id INTO v_coach_role
  FROM public.admin_role
  WHERE key = 'coach'
  LIMIT 1;

  IF v_coach_role IS NULL THEN
    RAISE EXCEPTION 'admin_role with key=coach not found. Run the CRM migration first.';
  END IF;

  -- Assign coach role (idempotent)
  INSERT INTO public.admin_user_role (member_id, role_id)
  VALUES (v_member_id, v_coach_role)
  ON CONFLICT (member_id, role_id) DO NOTHING;

  RAISE NOTICE 'Coach role assigned to rbradshaw+coach@gmail.com (member_id: %)', v_member_id;
END $$;
