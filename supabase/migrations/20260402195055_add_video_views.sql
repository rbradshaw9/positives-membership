
CREATE TABLE video_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id      uuid REFERENCES content(id) ON DELETE SET NULL,
  mux_asset_id    text,
  mux_playback_id text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  watch_percent   integer NOT NULL DEFAULT 0 CHECK (watch_percent BETWEEN 0 AND 100),
  completed       boolean NOT NULL DEFAULT false,
  session_count   integer NOT NULL DEFAULT 1
);

CREATE INDEX video_views_user_content_idx ON video_views (user_id, content_id);
CREATE INDEX video_views_user_completed_idx ON video_views (user_id, completed);

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own views"
  ON video_views FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
;
