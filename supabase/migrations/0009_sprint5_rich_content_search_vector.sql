-- =============================================================================
-- 0009_sprint5_rich_content_search_vector.sql
-- Positives Platform — Sprint 5: Rich Content + Search + Vector Foundation
-- =============================================================================
-- Adds richer content fields (body, reflection prompt, download link, YouTube),
-- Postgres full-text search vector, and vector-ready tables for future AI.
--
-- Non-destructive: all new columns; no existing columns removed.
-- =============================================================================

-- ─── Rich content fields ─────────────────────────────────────────────────────

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS body              TEXT,    -- Markdown body / supporting notes
  ADD COLUMN IF NOT EXISTS reflection_prompt TEXT,    -- Suggested reflection question
  ADD COLUMN IF NOT EXISTS download_url      TEXT,    -- PDF / worksheet link
  ADD COLUMN IF NOT EXISTS youtube_video_id  TEXT,    -- YouTube video ID (watch?v=…)
  ADD COLUMN IF NOT EXISTS resource_links    JSONB NOT NULL DEFAULT '[]'::jsonb;
                                                     -- [{label, url, type?}] supplementary links

-- ─── Full-text search ────────────────────────────────────────────────────────
-- Generated tsvector column combining key text fields at weighted ranks:
--   A = title (highest relevance)
--   B = excerpt
--   C = body + description
--   D = transcription (broadest, lowest weight — catches semantic gaps)
--
-- Using STORED generated column so the vector is persisted and GIN-indexed.
-- Updates automatically whenever underlying text columns change.

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

-- ─── Vector / AI readiness ───────────────────────────────────────────────────
-- These tables are created empty. No embeddings are generated in Sprint 5.
-- The schema is ready so a future backfill job can populate them without
-- requiring a migration.

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Full-content embeddings (one per content item)
CREATE TABLE IF NOT EXISTS content_embedding (
  content_id  UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  embedding   VECTOR(1536),                         -- OpenAI text-embedding-3-small
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chunked embeddings (multiple per content item — for RAG)
CREATE TABLE IF NOT EXISTS content_chunk (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id  UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,                     -- order within the source
  chunk_text  TEXT NOT NULL,                        -- the actual text chunk
  token_count INTEGER,                              -- approximate tokens
  embedding   VECTOR(1536),                         -- null until embedded
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_chunk_content_id
  ON content_chunk(content_id);

-- Note: IVFFlat indexes on embedding columns are deferred until the tables
-- have data. Creating IVFFlat on an empty table would use zero lists and
-- provide no benefit. The index will be added by the embedding backfill job.
