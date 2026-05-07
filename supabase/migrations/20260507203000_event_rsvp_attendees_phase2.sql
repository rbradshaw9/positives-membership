CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.event_rsvp_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'RSVP',
  description TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  collect_attendee_info BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_rsvp_type_event_idx ON public.event_rsvp_type(event_id, status, sort_order);
CREATE INDEX IF NOT EXISTS event_rsvp_type_window_idx ON public.event_rsvp_type(start_at, end_at);

DROP TRIGGER IF EXISTS event_rsvp_type_updated_at ON public.event_rsvp_type;
CREATE TRIGGER event_rsvp_type_updated_at
  BEFORE UPDATE ON public.event_rsvp_type
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_attendee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  rsvp_type_id UUID REFERENCES public.event_rsvp_type(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.event_ticket(id) ON DELETE SET NULL,
  ticket_type_id UUID REFERENCES public.event_ticket_type(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.event_ticket_order(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.member(id) ON DELETE SET NULL,
  attendee_number TEXT NOT NULL DEFAULT ('ATT-' || upper(encode(gen_random_bytes(6), 'hex'))) UNIQUE,
  security_code TEXT NOT NULL DEFAULT upper(encode(gen_random_bytes(6), 'hex')) UNIQUE,
  qr_token_hash TEXT NOT NULL DEFAULT encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'),
  name TEXT,
  email TEXT,
  purchaser_name TEXT,
  purchaser_email TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'canceled', 'refunded', 'chargeback', 'no_show')),
  source TEXT NOT NULL DEFAULT 'rsvp' CHECK (source IN ('rsvp', 'manual', 'paid', 'comp')),
  custom_field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_visibility BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_attendee_event_idx ON public.event_attendee(event_id, status, created_at);
CREATE INDEX IF NOT EXISTS event_attendee_member_idx ON public.event_attendee(member_id, event_id);
CREATE INDEX IF NOT EXISTS event_attendee_rsvp_idx ON public.event_attendee(rsvp_type_id, status);
CREATE INDEX IF NOT EXISTS event_attendee_email_idx ON public.event_attendee(lower(email));
CREATE INDEX IF NOT EXISTS event_attendee_ticket_idx ON public.event_attendee(ticket_id);

CREATE UNIQUE INDEX IF NOT EXISTS event_attendee_one_active_rsvp_per_member_idx
  ON public.event_attendee(event_id, rsvp_type_id, member_id)
  WHERE member_id IS NOT NULL
    AND rsvp_type_id IS NOT NULL
    AND source = 'rsvp'
    AND status IN ('registered', 'checked_in');

DROP TRIGGER IF EXISTS event_attendee_updated_at ON public.event_attendee;
CREATE TRIGGER event_attendee_updated_at
  BEFORE UPDATE ON public.event_attendee
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_check_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES public.event_attendee(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('qr', 'manual', 'import')),
  device_id TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'reversed')),
  reversed_at TIMESTAMPTZ,
  reversed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_check_in_event_idx ON public.event_check_in(event_id, checked_in_at);
CREATE INDEX IF NOT EXISTS event_check_in_attendee_idx ON public.event_check_in(attendee_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS event_check_in_one_active_idx
  ON public.event_check_in(attendee_id)
  WHERE status = 'checked_in';

DROP TRIGGER IF EXISTS event_check_in_updated_at ON public.event_check_in;
CREATE TRIGGER event_check_in_updated_at
  BEFORE UPDATE ON public.event_check_in
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_rsvp_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_check_in ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_rsvp_type_authenticated_read" ON public.event_rsvp_type;
CREATE POLICY "event_rsvp_type_authenticated_read"
  ON public.event_rsvp_type
  FOR SELECT
  TO authenticated
  USING (status <> 'archived');

DROP POLICY IF EXISTS "event_attendee_member_read_own" ON public.event_attendee;
CREATE POLICY "event_attendee_member_read_own"
  ON public.event_attendee
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "event_check_in_member_read_own" ON public.event_check_in;
CREATE POLICY "event_check_in_member_read_own"
  ON public.event_check_in
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_attendee attendee
      WHERE attendee.id = event_check_in.attendee_id
        AND attendee.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_rsvp_type_service_manage" ON public.event_rsvp_type;
CREATE POLICY "event_rsvp_type_service_manage"
  ON public.event_rsvp_type
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "event_attendee_service_manage" ON public.event_attendee;
CREATE POLICY "event_attendee_service_manage"
  ON public.event_attendee
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "event_check_in_service_manage" ON public.event_check_in;
CREATE POLICY "event_check_in_service_manage"
  ON public.event_check_in
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.register_event_rsvp(
  p_member_id UUID,
  p_event_id UUID,
  p_member_tier TEXT,
  p_rsvp_type_id UUID,
  p_attendee_name TEXT DEFAULT NULL,
  p_attendee_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event member_event%ROWTYPE;
  v_rsvp event_rsvp_type%ROWTYPE;
  v_member member%ROWTYPE;
  v_existing UUID;
  v_confirmed_count INTEGER;
  v_attendee_id UUID;
BEGIN
  SELECT *
  INTO v_event
  FROM public.member_event
  WHERE id = p_event_id
    AND status = 'published'
    AND visibility <> 'hidden';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event is not available for RSVP';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.member_event_access_level access
    WHERE access.event_id = p_event_id
      AND access.subscription_tier = p_member_tier::public.subscription_tier
  ) THEN
    RAISE EXCEPTION 'Membership level cannot RSVP for this event';
  END IF;

  SELECT *
  INTO v_rsvp
  FROM public.event_rsvp_type
  WHERE id = p_rsvp_type_id
    AND event_id = p_event_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RSVP is not available';
  END IF;

  IF v_rsvp.start_at IS NOT NULL AND NOW() < v_rsvp.start_at THEN
    RAISE EXCEPTION 'RSVP is not open yet';
  END IF;

  IF v_rsvp.end_at IS NOT NULL AND NOW() > v_rsvp.end_at THEN
    RAISE EXCEPTION 'RSVP has closed';
  END IF;

  SELECT id
  INTO v_existing
  FROM public.event_attendee
  WHERE event_id = p_event_id
    AND rsvp_type_id = p_rsvp_type_id
    AND member_id = p_member_id
    AND source = 'rsvp'
    AND status IN ('registered', 'checked_in')
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_rsvp.capacity IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_confirmed_count
    FROM public.event_attendee
    WHERE rsvp_type_id = p_rsvp_type_id
      AND status IN ('registered', 'checked_in');

    IF v_confirmed_count >= v_rsvp.capacity THEN
      RAISE EXCEPTION 'RSVP is full';
    END IF;
  END IF;

  SELECT *
  INTO v_member
  FROM public.member
  WHERE id = p_member_id;

  INSERT INTO public.event_attendee (
    event_id,
    rsvp_type_id,
    member_id,
    name,
    email,
    purchaser_name,
    purchaser_email,
    status,
    source
  )
  VALUES (
    p_event_id,
    p_rsvp_type_id,
    p_member_id,
    NULLIF(trim(COALESCE(p_attendee_name, v_member.name, '')), ''),
    NULLIF(trim(COALESCE(p_attendee_email, v_member.email, '')), ''),
    v_member.name,
    v_member.email,
    'registered',
    'rsvp'
  )
  RETURNING id INTO v_attendee_id;

  RETURN v_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_event_rsvp(UUID, UUID, TEXT, UUID, TEXT, TEXT) TO service_role;
