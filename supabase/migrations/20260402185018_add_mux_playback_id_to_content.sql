
-- Add Mux video columns to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;

-- Index for fast lookup when backfilling
CREATE INDEX IF NOT EXISTS idx_content_mux_playback_id ON content (mux_playback_id) WHERE mux_playback_id IS NOT NULL;

COMMENT ON COLUMN content.mux_playback_id IS 'Mux playback ID — used by <MuxPlayer> for streaming. Takes precedence over vimeo_video_id when present.';
COMMENT ON COLUMN content.mux_asset_id IS 'Mux asset ID — used for asset management (deletion, status checks) via Mux API.';
;
