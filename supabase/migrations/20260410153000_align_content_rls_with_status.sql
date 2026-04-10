DROP POLICY IF EXISTS "content: select for active members"
  ON content;

CREATE POLICY "content: select for active members"
  ON content FOR SELECT
  TO authenticated
  USING (
    status = 'published'::content_status
    AND EXISTS (
      SELECT 1 FROM member
      WHERE member.id = auth.uid()
        AND member.subscription_status = 'active'
    )
  );

UPDATE content
SET is_active = TRUE
WHERE status = 'published'
  AND is_active = FALSE;
