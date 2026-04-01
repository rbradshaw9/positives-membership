-- =============================================================================
-- 0007_activity_event_rls.sql
-- Enable Row Level Security on activity_event table.
-- =============================================================================
-- Members may only read their own events.
-- All writes happen via server-side service role (actions.ts) — never direct
-- from the client. INSERT/UPDATE/DELETE are intentionally blocked for members.

ALTER TABLE activity_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_event: members read own" ON activity_event
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

-- No member INSERT/UPDATE/DELETE policies — all writes are server-side only.
