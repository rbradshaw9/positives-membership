-- Create member_w9 table for self-hosted W9 collection
-- Shown in the Earnings tab when an affiliate has earned ≥$500 (soft) or ≥$600 (required)

CREATE TABLE IF NOT EXISTS member_w9 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  business_name text,
  -- 'individual', 's_corp', 'c_corp', 'partnership', 'llc_single', 'llc_multi', 'other'
  tax_classification text NOT NULL,
  -- SSN (XXX-XX-XXXX) or EIN (XX-XXXXXXX) — plaintext PII, treat accordingly
  tax_id text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state_code char(2) NOT NULL,
  zip text NOT NULL,
  -- Typed name serving as electronic signature
  signature_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_w9 ENABLE ROW LEVEL SECURITY;

-- Affiliates can only read/write their own W9
CREATE POLICY "member_w9_owner" ON member_w9
  FOR ALL
  USING (auth.uid() = member_id)
  WITH CHECK (auth.uid() = member_id);

-- Service role needs full access for admin queries
CREATE POLICY "member_w9_service_role" ON member_w9
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- One W9 per member (using upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS member_w9_member_id_idx ON member_w9 (member_id);
