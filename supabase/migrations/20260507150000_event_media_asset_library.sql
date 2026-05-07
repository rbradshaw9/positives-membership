CREATE TABLE IF NOT EXISTS public.media_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_provider TEXT NOT NULL DEFAULT 's3' CHECK (storage_provider IN ('s3')),
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'audio', 'document', 'video', 'other')),
  usage_context TEXT NOT NULL DEFAULT 'event' CHECK (usage_context IN ('event', 'course', 'daily_practice', 'member', 'admin', 'general')),
  title TEXT,
  alt_text TEXT,
  original_filename TEXT,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  width INTEGER,
  height INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'orphaned', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'member' CHECK (visibility IN ('member', 'admin')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.member_event_media_asset (
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.media_asset(id) ON DELETE RESTRICT,
  usage TEXT NOT NULL DEFAULT 'body_image' CHECK (usage IN ('body_image', 'featured_image', 'attachment')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, asset_id, usage)
);

CREATE INDEX IF NOT EXISTS idx_media_asset_library
  ON public.media_asset (usage_context, kind, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_asset_uploaded_by
  ON public.media_asset (uploaded_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_event_media_asset_asset
  ON public.member_event_media_asset (asset_id, event_id);

DROP TRIGGER IF EXISTS media_asset_updated_at ON public.media_asset;
CREATE TRIGGER media_asset_updated_at
  BEFORE UPDATE ON public.media_asset
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_event_media_asset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active member media assets are readable by authenticated users"
  ON public.media_asset FOR SELECT
  TO authenticated
  USING (status = 'active' AND visibility = 'member');

CREATE POLICY "event media asset links are readable by authenticated users"
  ON public.member_event_media_asset FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE public.media_asset IS
  'Provider-neutral media asset metadata. S3 stores file bytes; Supabase tracks library, access, and future Castos/source relationships.';

COMMENT ON TABLE public.member_event_media_asset IS
  'Links reusable media assets to member events so event image library uploads can be reused and cleaned up safely later.';
