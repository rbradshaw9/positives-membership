-- Enable RLS on new Sprint 5 tables
-- These tables are server-managed (embedding backfill jobs), so no member-facing
-- policies are needed. RLS is enabled to block anonymous/client access.

ALTER TABLE content_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunk ENABLE ROW LEVEL SECURITY;

-- Service-role can read/write (for the embedding pipeline)
-- No anon or authenticated policies — these are internal tables

-- Create the migration file for consistency
-- Move vector extension to 'extensions' schema (if available)
-- (Supabase already has an 'extensions' schema on managed projects)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vector extension already in public, leaving it';
END $$;;
