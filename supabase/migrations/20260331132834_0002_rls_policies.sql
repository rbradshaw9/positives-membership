ALTER TABLE member         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content        ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member: select own row"
  ON member FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "member: update own row"
  ON member FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "content: select for active members"
  ON content FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM member
      WHERE member.id = auth.uid()
        AND member.subscription_status = 'active'
    )
  );

CREATE POLICY "progress: select own rows"
  ON progress FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "progress: insert own rows"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "progress: update own rows"
  ON progress FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "journal: select own rows"
  ON journal FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "journal: insert own rows"
  ON journal FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "journal: update own rows"
  ON journal FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "journal: delete own rows"
  ON journal FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_post: select for active members"
  ON community_post FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE member.id = auth.uid()
        AND member.subscription_status = 'active'
    )
  );

CREATE POLICY "community_post: insert own rows"
  ON community_post FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "community_post: update own rows"
  ON community_post FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "community_post: delete own rows"
  ON community_post FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());;
