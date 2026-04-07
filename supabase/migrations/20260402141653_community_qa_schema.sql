-- Extend community_post with threading & admin features
ALTER TABLE community_post
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES community_post(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_admin_answer BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_community_post_parent_id
  ON community_post (parent_id);

CREATE INDEX IF NOT EXISTS idx_community_post_content_id
  ON community_post (content_id);

-- community_post_like table
CREATE TABLE IF NOT EXISTS community_post_like (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_like_post_id
  ON community_post_like (post_id);

CREATE INDEX IF NOT EXISTS idx_community_post_like_member_id
  ON community_post_like (member_id);

-- RLS for community_post_like
ALTER TABLE community_post_like ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_post_like: select for all authenticated"
  ON community_post_like FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "community_post_like: insert own rows"
  ON community_post_like FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "community_post_like: delete own rows"
  ON community_post_like FOR DELETE
  TO authenticated
  USING (auth.uid() = member_id);;
