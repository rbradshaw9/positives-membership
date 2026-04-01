-- =============================================================================
-- 0008_journal_rls_and_index.sql
-- Add RLS to journal table + add content_id index for efficient note lookup.
-- =============================================================================

-- Enable RLS
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- Members can only read/write their own notes
CREATE POLICY "journal: members select own" ON journal
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "journal: members insert own" ON journal
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "journal: members update own" ON journal
  FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- Index for fast note lookup by (member, content) pair — used in NoteSheet open
CREATE INDEX IF NOT EXISTS idx_journal_member_content
  ON journal (member_id, content_id)
  WHERE content_id IS NOT NULL;
