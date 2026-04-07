-- Sprint 5: Rich Content + Search + Vector Foundation

-- Rich content fields
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS body              TEXT,
  ADD COLUMN IF NOT EXISTS reflection_prompt TEXT,
  ADD COLUMN IF NOT EXISTS download_url      TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id  TEXT,
  ADD COLUMN IF NOT EXISTS resource_links    JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Full-text search vector
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(body, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(transcription, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_content_search_vector
  ON content USING gin(search_vector);

-- Vector/AI readiness (empty tables)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS content_embedding (
  content_id  UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  embedding   VECTOR(1536),
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_chunk (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text  TEXT NOT NULL,
  token_count INTEGER,
  embedding   VECTOR(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_chunk_content_id
  ON content_chunk(content_id);;
