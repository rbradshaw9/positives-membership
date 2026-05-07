ALTER TABLE public.member_event
  ADD COLUMN IF NOT EXISTS event_capacity INTEGER CHECK (event_capacity IS NULL OR event_capacity >= 0),
  ADD COLUMN IF NOT EXISTS registration_placement TEXT NOT NULL DEFAULT 'after_description'
    CHECK (registration_placement IN ('below_hero', 'after_description', 'sidebar'));

CREATE INDEX IF NOT EXISTS idx_member_event_capacity
  ON public.member_event(id, event_capacity)
  WHERE event_capacity IS NOT NULL;

DROP FUNCTION IF EXISTS public.register_event_rsvp(UUID, UUID, TEXT, UUID, TEXT, TEXT, JSONB);

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
  v_event_active_count INTEGER;
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

  IF v_event.event_capacity IS NOT NULL THEN
    SELECT
      COALESCE((SELECT COUNT(*) FROM public.event_attendee attendee WHERE attendee.event_id = p_event_id AND attendee.source IN ('rsvp', 'manual') AND attendee.status IN ('registered', 'checked_in')), 0)
      + COALESCE((SELECT COUNT(*) FROM public.event_ticket ticket LEFT JOIN public.event_ticket_order ticket_order ON ticket_order.id = ticket.order_id WHERE ticket.event_id = p_event_id AND (ticket.status IN ('active', 'comp') OR (ticket.status = 'pending' AND ticket_order.expires_at > NOW()))), 0)
    INTO v_event_active_count;

    IF v_event_active_count >= v_event.event_capacity THEN
      RAISE EXCEPTION 'Event capacity is full';
    END IF;
  END IF;

  SELECT *
  INTO v_member
  FROM public.member
  WHERE id = p_member_id;

  INSERT INTO public.event_attendee (
    event_id, rsvp_type_id, member_id, name, email, purchaser_name, purchaser_email, status, source, custom_field_values
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

CREATE OR REPLACE FUNCTION public.reserve_event_ticket_order(
  p_member_id UUID,
  p_event_id UUID,
  p_member_tier subscription_tier,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_event public.member_event%ROWTYPE;
  v_order_id UUID;
  v_item JSONB;
  v_ticket_type public.event_ticket_type%ROWTYPE;
  v_ticket_item_id UUID;
  v_quantity INTEGER;
  v_guest JSONB;
  v_active_count INTEGER;
  v_event_active_count INTEGER;
  v_subtotal INTEGER := 0;
  v_total_quantity INTEGER := 0;
  v_currency TEXT := 'usd';
  v_index INTEGER;
  v_guest_index INTEGER;
BEGIN
  IF p_member_id IS NULL OR p_event_id IS NULL OR p_member_tier IS NULL THEN
    RAISE EXCEPTION 'Missing ticket reservation context.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Choose at least one ticket.';
  END IF;

  SELECT *
    INTO v_event
    FROM public.member_event
    WHERE id = p_event_id
      AND status = 'published'
      AND visibility <> 'hidden'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event is not available.';
  END IF;

  IF v_event.ticketing_mode <> 'ticket_required' THEN
    RAISE EXCEPTION 'This event does not require tickets.';
  END IF;

  IF v_event.starts_at <= NOW() THEN
    RAISE EXCEPTION 'Ticket sales have closed for this event.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.member_event_access_level meal
    WHERE meal.event_id = p_event_id
      AND meal.subscription_tier = p_member_tier
  ) THEN
    RAISE EXCEPTION 'This event is not available for this membership level.';
  END IF;

  INSERT INTO public.event_ticket_order (
    member_id, event_id, status, currency, subtotal_cents, total_cents, quantity, expires_at
  )
  VALUES (
    p_member_id, p_event_id, 'pending', v_currency, 0, 0, 0, NOW() + INTERVAL '15 minutes'
  )
  RETURNING id INTO v_order_id;

  FOR v_index IN 0..jsonb_array_length(p_items) - 1 LOOP
    v_item := p_items -> v_index;
    v_quantity := COALESCE((v_item ->> 'quantity')::INTEGER, 0);

    IF v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    SELECT *
      INTO v_ticket_type
      FROM public.event_ticket_type
      WHERE id = (v_item ->> 'ticket_type_id')::UUID
        AND event_id = p_event_id
        AND status = 'active'
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ticket type is not available.';
    END IF;

    IF v_ticket_type.sale_starts_at IS NOT NULL AND v_ticket_type.sale_starts_at > NOW() THEN
      RAISE EXCEPTION 'Ticket sales have not opened yet.';
    END IF;

    IF COALESCE(v_ticket_type.sale_ends_at, v_event.starts_at) <= NOW() THEN
      RAISE EXCEPTION 'Ticket sales have closed for this ticket type.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.event_ticket_type_access_level ettal
      WHERE ettal.ticket_type_id = v_ticket_type.id
        AND ettal.subscription_tier = p_member_tier
    ) THEN
      RAISE EXCEPTION 'This ticket type is not available for this membership level.';
    END IF;

    IF v_quantity > v_ticket_type.max_per_order THEN
      RAISE EXCEPTION 'Ticket quantity is above the per-order limit.';
    END IF;

    SELECT COUNT(*)::INTEGER
      INTO v_active_count
      FROM public.event_ticket et
      LEFT JOIN public.event_ticket_order eto ON eto.id = et.order_id
      WHERE et.ticket_type_id = v_ticket_type.id
        AND (
          et.status IN ('active', 'comp')
          OR (et.status = 'pending' AND eto.expires_at > NOW())
        );

    IF v_ticket_type.capacity IS NOT NULL AND v_active_count + v_quantity > v_ticket_type.capacity THEN
      RAISE EXCEPTION 'Not enough tickets remain.';
    END IF;

    IF v_event.event_capacity IS NOT NULL THEN
      SELECT
        COALESCE((SELECT COUNT(*) FROM public.event_attendee attendee WHERE attendee.event_id = p_event_id AND attendee.source IN ('rsvp', 'manual') AND attendee.status IN ('registered', 'checked_in')), 0)
        + COALESCE((SELECT COUNT(*) FROM public.event_ticket ticket LEFT JOIN public.event_ticket_order ticket_order ON ticket_order.id = ticket.order_id WHERE ticket.event_id = p_event_id AND (ticket.status IN ('active', 'comp') OR (ticket.status = 'pending' AND ticket_order.expires_at > NOW()))), 0)
      INTO v_event_active_count;

      IF v_event_active_count + v_total_quantity + v_quantity > v_event.event_capacity THEN
        RAISE EXCEPTION 'Not enough event capacity remains.';
      END IF;
    END IF;

    IF v_total_quantity = 0 THEN
      v_currency := v_ticket_type.currency;
    ELSIF v_currency <> v_ticket_type.currency THEN
      RAISE EXCEPTION 'All selected tickets must use the same currency.';
    END IF;

    INSERT INTO public.event_ticket_order_item (
      order_id, ticket_type_id, ticket_type_name, quantity, unit_amount_cents, total_amount_cents, currency
    )
    VALUES (
      v_order_id, v_ticket_type.id, v_ticket_type.name, v_quantity, v_ticket_type.price_cents,
      v_quantity * v_ticket_type.price_cents, v_ticket_type.currency
    )
    RETURNING id INTO v_ticket_item_id;

    FOR v_guest_index IN 0..v_quantity - 1 LOOP
      v_guest := COALESCE(v_item -> 'guests' -> v_guest_index, '{}'::jsonb);

      INSERT INTO public.event_ticket (
        order_id, order_item_id, ticket_type_id, event_id, member_id, status, guest_name, guest_email
      )
      VALUES (
        v_order_id, v_ticket_item_id, v_ticket_type.id, p_event_id, p_member_id, 'pending',
        NULLIF(TRIM(v_guest ->> 'name'), ''),
        NULLIF(TRIM(v_guest ->> 'email'), '')
      );
    END LOOP;

    v_subtotal := v_subtotal + (v_quantity * v_ticket_type.price_cents);
    v_total_quantity := v_total_quantity + v_quantity;
  END LOOP;

  IF v_total_quantity <= 0 THEN
    RAISE EXCEPTION 'Choose at least one ticket.';
  END IF;

  UPDATE public.event_ticket_order
    SET subtotal_cents = v_subtotal,
        total_cents = v_subtotal,
        quantity = v_total_quantity,
        currency = v_currency,
        updated_at = NOW()
    WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_event_ticket_order(UUID, UUID, subscription_tier, JSONB) TO authenticated;
