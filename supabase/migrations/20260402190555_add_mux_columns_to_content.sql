-- Add Mux video columns to content table
-- mux_asset_id: the internal Mux asset identifier (for management/replace/delete)
-- mux_playback_id: the public playback ID used in the player URL
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS mux_asset_id    TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

COMMENT ON COLUMN content.mux_asset_id    IS 'Mux asset ID — internal identifier used to manage/replace/delete the asset via API';
COMMENT ON COLUMN content.mux_playback_id IS 'Mux public playback ID — used to construct the player URL (stream.mux.com/{id}.m3u8)';;
