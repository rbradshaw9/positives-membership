ALTER TABLE public.event_rsvp_type
  ADD COLUMN IF NOT EXISTS registration_fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.event_rsvp_type
  DROP CONSTRAINT IF EXISTS event_rsvp_type_registration_fields_array;

ALTER TABLE public.event_rsvp_type
  ADD CONSTRAINT event_rsvp_type_registration_fields_array
  CHECK (jsonb_typeof(registration_fields) = 'array');

DROP FUNCTION IF EXISTS public.register_event_rsvp(UUID, UUID, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_event_rsvp(
  p_member_id UUID,
  p_event_id UUID,
  p_member_tier TEXT,
  p_rsvp_type_id UUID,
  p_attendee_name TEXT DEFAULT NULL,
  p_attendee_email TEXT DEFAULT NULL,
  p_custom_field_values JSONB DEFAULT '{}'::jsonb
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
  v_field JSONB;
  v_field_id TEXT;
  v_field_type TEXT;
  v_field_required BOOLEAN;
  v_field_value TEXT;
  v_option JSONB;
  v_option_match BOOLEAN;
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

  IF p_custom_field_values IS NULL OR jsonb_typeof(p_custom_field_values) <> 'object' THEN
    p_custom_field_values := '{}'::jsonb;
  END IF;

  FOR v_field IN SELECT * FROM jsonb_array_elements(COALESCE(v_rsvp.registration_fields, '[]'::jsonb)) LOOP
    v_field_id := NULLIF(TRIM(v_field ->> 'id'), '');
    v_field_type := COALESCE(NULLIF(TRIM(v_field ->> 'type'), ''), 'short_text');
    v_field_required := COALESCE((v_field ->> 'required')::BOOLEAN, FALSE);
    IF v_field_id IS NULL THEN
      CONTINUE;
    END IF;

    v_field_value := NULLIF(TRIM(COALESCE(p_custom_field_values ->> v_field_id, '')), '');

    IF v_field_required THEN
      IF v_field_type = 'checkbox' THEN
        IF COALESCE(p_custom_field_values ->> v_field_id, '') <> 'true' THEN
          RAISE EXCEPTION 'Required registration field is missing';
        END IF;
      ELSIF v_field_value IS NULL THEN
        RAISE EXCEPTION 'Required registration field is missing';
      END IF;
    END IF;

    IF v_field_value IS NOT NULL AND v_field_type = 'email' AND v_field_value !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
      RAISE EXCEPTION 'Registration email field is invalid';
    END IF;

    IF v_field_value IS NOT NULL AND v_field_type = 'select' AND jsonb_typeof(v_field -> 'options') = 'array' THEN
      v_option_match := FALSE;
      FOR v_option IN SELECT * FROM jsonb_array_elements(v_field -> 'options') LOOP
        IF v_field_value = COALESCE(NULLIF(TRIM(v_option ->> 'value'), ''), NULLIF(TRIM(v_option ->> 'label'), '')) THEN
          v_option_match := TRUE;
        END IF;
      END LOOP;
      IF NOT v_option_match THEN
        RAISE EXCEPTION 'Registration selection is invalid';
      END IF;
    END IF;
  END LOOP;

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
    source,
    custom_field_values
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
    'rsvp',
    p_custom_field_values
  )
  RETURNING id INTO v_attendee_id;

  RETURN v_attendee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_event_rsvp(UUID, UUID, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;
