-- =============================================================================
-- 0010_sprint5_rls_vector_tables.sql
-- Enable RLS on content_embedding and content_chunk tables.
-- These are server-managed (embedding pipeline), so no member-facing policies
-- are needed. RLS enabled to block anonymous/client access.
-- =============================================================================

ALTER TABLE content_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunk ENABLE ROW LEVEL SECURITY;
