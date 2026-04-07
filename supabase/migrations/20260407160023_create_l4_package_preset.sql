-- l4_package_preset: reusable L4 package configurations created by admin.
-- Each successful custom package submission is saved here for one-click reuse.

CREATE TABLE IF NOT EXISTS l4_package_preset (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  amount_cents   integer     NOT NULL CHECK (amount_cents > 0),
  billing_type   text        NOT NULL CHECK (billing_type IN ('one_time','monthly','quarterly','annual')),
  cycles         integer     CHECK (cycles IS NULL OR cycles > 0),
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text        -- admin email
);

-- Admin-only: no public access via anon key
ALTER TABLE l4_package_preset ENABLE ROW LEVEL SECURITY;

-- Service role (used by server actions) bypasses RLS automatically.
-- No RLS policies needed — anon/authenticated users cannot read or write.
