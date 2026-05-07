ALTER TABLE public.member_event
  ADD COLUMN IF NOT EXISTS ticketing_mode TEXT NOT NULL DEFAULT 'included'
  CHECK (ticketing_mode IN ('included', 'ticket_required'));

CREATE TABLE IF NOT EXISTS public.event_setting (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_ticket_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  max_per_order INTEGER NOT NULL DEFAULT 4 CHECK (max_per_order > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'archived')),
  sale_starts_at TIMESTAMPTZ,
  sale_ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_ticket_type_access_level (
  ticket_type_id UUID NOT NULL REFERENCES public.event_ticket_type(id) ON DELETE CASCADE,
  subscription_tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_type_id, subscription_tier)
);

CREATE TABLE IF NOT EXISTS public.event_ticket_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'chargeback', 'canceled', 'comp', 'expired')),
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  grant_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_ticket_order_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.event_ticket_order(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.event_ticket_type(id) ON DELETE SET NULL,
  ticket_type_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_amount_cents >= 0),
  total_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.event_ticket_order(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.event_ticket_order_item(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.event_ticket_type(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'refunded', 'chargeback', 'canceled', 'comp', 'expired')),
  guest_name TEXT,
  guest_email TEXT,
  ticket_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex') UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_event_ticketing_mode
  ON public.member_event (ticketing_mode, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_event_ticket_type_event_status
  ON public.event_ticket_type (event_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_event_ticket_type_access_level_tier
  ON public.event_ticket_type_access_level (subscription_tier, ticket_type_id);

CREATE INDEX IF NOT EXISTS idx_event_ticket_order_member_status
  ON public.event_ticket_order (member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_ticket_order_event_status
  ON public.event_ticket_order (event_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_ticket_order_payment_intent
  ON public.event_ticket_order (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ticket_order_checkout_session
  ON public.event_ticket_order (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ticket_order_charge
  ON public.event_ticket_order (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_ticket_access
  ON public.event_ticket (member_id, event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_ticket_type_capacity
  ON public.event_ticket (ticket_type_id, status);

DROP TRIGGER IF EXISTS event_setting_updated_at ON public.event_setting;
CREATE TRIGGER event_setting_updated_at
  BEFORE UPDATE ON public.event_setting
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS event_ticket_type_updated_at ON public.event_ticket_type;
CREATE TRIGGER event_ticket_type_updated_at
  BEFORE UPDATE ON public.event_ticket_type
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS event_ticket_order_updated_at ON public.event_ticket_order;
CREATE TRIGGER event_ticket_order_updated_at
  BEFORE UPDATE ON public.event_ticket_order
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS event_ticket_updated_at ON public.event_ticket;
CREATE TRIGGER event_ticket_updated_at
  BEFORE UPDATE ON public.event_ticket
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_setting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_type_access_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_order_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event settings readable by authenticated users"
  ON public.event_setting;
CREATE POLICY "event settings readable by authenticated users"
  ON public.event_setting FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "event ticket types readable by authenticated users"
  ON public.event_ticket_type;
CREATE POLICY "event ticket types readable by authenticated users"
  ON public.event_ticket_type FOR SELECT
  TO authenticated
  USING (status <> 'archived');

DROP POLICY IF EXISTS "event ticket type access readable by authenticated users"
  ON public.event_ticket_type_access_level;
CREATE POLICY "event ticket type access readable by authenticated users"
  ON public.event_ticket_type_access_level FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "members can read their event ticket orders"
  ON public.event_ticket_order;
CREATE POLICY "members can read their event ticket orders"
  ON public.event_ticket_order FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "members can read their event ticket order items"
  ON public.event_ticket_order_item;
CREATE POLICY "members can read their event ticket order items"
  ON public.event_ticket_order_item FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_ticket_order eto
      WHERE eto.id = event_ticket_order_item.order_id
        AND eto.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members can read their event tickets"
  ON public.event_ticket;
CREATE POLICY "members can read their event tickets"
  ON public.event_ticket FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

INSERT INTO public.event_setting (key, value, description)
VALUES
  ('default_timezone', '"America/New_York"'::jsonb, 'Default timezone for new events.'),
  ('default_access_levels', '["level_2"]'::jsonb, 'Default membership levels selected for new events.'),
  ('ticket_sales_close', '"event_start"'::jsonb, 'Default ticket sales close behavior.'),
  ('default_max_per_order', '4'::jsonb, 'Default maximum tickets per order.')
ON CONFLICT (key) DO NOTHING;

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
      AND visibility <> 'hidden';

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
    member_id,
    event_id,
    status,
    currency,
    subtotal_cents,
    total_cents,
    quantity,
    expires_at
  )
  VALUES (
    p_member_id,
    p_event_id,
    'pending',
    v_currency,
    0,
    0,
    0,
    NOW() + INTERVAL '15 minutes'
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

    IF v_total_quantity = 0 THEN
      v_currency := v_ticket_type.currency;
    ELSIF v_currency <> v_ticket_type.currency THEN
      RAISE EXCEPTION 'All selected tickets must use the same currency.';
    END IF;

    INSERT INTO public.event_ticket_order_item (
      order_id,
      ticket_type_id,
      ticket_type_name,
      quantity,
      unit_amount_cents,
      total_amount_cents,
      currency
    )
    VALUES (
      v_order_id,
      v_ticket_type.id,
      v_ticket_type.name,
      v_quantity,
      v_ticket_type.price_cents,
      v_quantity * v_ticket_type.price_cents,
      v_ticket_type.currency
    )
    RETURNING id INTO v_ticket_item_id;

    FOR v_guest_index IN 0..v_quantity - 1 LOOP
      v_guest := COALESCE(v_item -> 'guests' -> v_guest_index, '{}'::jsonb);

      INSERT INTO public.event_ticket (
        order_id,
        order_item_id,
        ticket_type_id,
        event_id,
        member_id,
        status,
        guest_name,
        guest_email
      )
      VALUES (
        v_order_id,
        v_ticket_item_id,
        v_ticket_type.id,
        p_event_id,
        p_member_id,
        'pending',
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

COMMENT ON TABLE public.event_ticket_type IS
  'Ticket products for member-only events. Stripe charges are created dynamically from these rows.';

COMMENT ON FUNCTION public.reserve_event_ticket_order(UUID, UUID, subscription_tier, JSONB) IS
  'Creates a short-lived pending ticket order while holding capacity with row-level locks.';
