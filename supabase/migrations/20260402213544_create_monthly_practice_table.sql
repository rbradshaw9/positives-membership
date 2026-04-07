-- ============================================================================
-- Monthly Practice: parent entity for organizing a month's content
-- ============================================================================

-- 1. Create the monthly_practice table
CREATE TABLE monthly_practice (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year    text UNIQUE NOT NULL,
  label         text NOT NULL,
  status        content_status DEFAULT 'draft'::content_status,
  description   text,
  admin_notes   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE monthly_practice IS 'Parent entity grouping all content for a calendar month.';
COMMENT ON COLUMN monthly_practice.month_year IS 'Canonical YYYY-MM key, unique per month.';
COMMENT ON COLUMN monthly_practice.label IS 'Human-readable label, e.g. April 2026.';

ALTER TABLE monthly_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published months"
  ON monthly_practice FOR SELECT
  USING (status = 'published'::content_status);

-- 2. Add FK column on content pointing to the parent month
ALTER TABLE content
  ADD COLUMN monthly_practice_id uuid REFERENCES monthly_practice(id);

CREATE INDEX idx_content_monthly_practice_id ON content(monthly_practice_id);

-- 3. Backfill: create monthly_practice rows from existing content.month_year
INSERT INTO monthly_practice (month_year, label, status)
SELECT DISTINCT
  month_year,
  TO_CHAR(TO_DATE(month_year, 'YYYY-MM'), 'FMMonth YYYY'),
  'published'::content_status
FROM content
WHERE month_year IS NOT NULL
ON CONFLICT (month_year) DO NOTHING;

-- 4. Link existing content rows to their parent month
UPDATE content c
SET monthly_practice_id = mp.id
FROM monthly_practice mp
WHERE c.month_year = mp.month_year
  AND c.monthly_practice_id IS NULL;;
