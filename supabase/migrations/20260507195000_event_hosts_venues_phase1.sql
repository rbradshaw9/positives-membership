CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.event_host
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_visibility TEXT NOT NULL DEFAULT 'logged_in',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.event_host
  DROP CONSTRAINT IF EXISTS event_host_type_check,
  ADD CONSTRAINT event_host_type_check CHECK (type IN ('person', 'organization', 'brand', 'internal_team')),
  DROP CONSTRAINT IF EXISTS event_host_contact_visibility_check,
  ADD CONSTRAINT event_host_contact_visibility_check CHECK (contact_visibility IN ('public', 'logged_in', 'private')),
  DROP CONSTRAINT IF EXISTS event_host_status_check,
  ADD CONSTRAINT event_host_status_check CHECK (status IN ('published', 'draft', 'archived'));

UPDATE public.event_host
SET
  slug = COALESCE(
    NULLIF(slug, ''),
    trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(id::text, 8)
  ),
  status = CASE WHEN is_active THEN 'published' ELSE 'archived' END
WHERE slug IS NULL OR slug = '' OR status IS NULL;

ALTER TABLE public.event_host
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_host_slug_key ON public.event_host(slug);
CREATE INDEX IF NOT EXISTS event_host_status_idx ON public.event_host(status);
CREATE INDEX IF NOT EXISTS event_host_type_idx ON public.event_host(type);

ALTER TABLE public.event_venue
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS show_map BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_map_link BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS accessibility_notes TEXT,
  ADD COLUMN IF NOT EXISTS parking_notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE public.event_venue
  DROP CONSTRAINT IF EXISTS event_venue_status_check,
  ADD CONSTRAINT event_venue_status_check CHECK (status IN ('published', 'draft', 'archived'));

UPDATE public.event_venue
SET
  slug = COALESCE(
    NULLIF(slug, ''),
    trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(id::text, 8)
  ),
  status = CASE WHEN is_active THEN 'published' ELSE 'archived' END
WHERE slug IS NULL OR slug = '' OR status IS NULL;

ALTER TABLE public.event_venue
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_venue_slug_key ON public.event_venue(slug);
CREATE INDEX IF NOT EXISTS event_venue_status_idx ON public.event_venue(status);
CREATE INDEX IF NOT EXISTS event_venue_location_idx ON public.event_venue(city, region, country);

ALTER TABLE public.member_event
  ADD COLUMN IF NOT EXISTS venue_room_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_notes TEXT;

CREATE TABLE IF NOT EXISTS public.event_host_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.event_host(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'organizer', 'speaker', 'instructor', 'partner')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, host_id)
);

CREATE INDEX IF NOT EXISTS event_host_assignment_event_idx ON public.event_host_assignment(event_id, sort_order);
CREATE INDEX IF NOT EXISTS event_host_assignment_host_idx ON public.event_host_assignment(host_id, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_host_assignment_one_primary_idx
  ON public.event_host_assignment(event_id)
  WHERE is_primary;

DROP TRIGGER IF EXISTS event_host_assignment_updated_at ON public.event_host_assignment;
CREATE TRIGGER event_host_assignment_updated_at
  BEFORE UPDATE ON public.event_host_assignment
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_host_assignment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_host_assignment_authenticated_read" ON public.event_host_assignment;
CREATE POLICY "event_host_assignment_authenticated_read"
  ON public.event_host_assignment
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "event_host_assignment_service_manage" ON public.event_host_assignment;
CREATE POLICY "event_host_assignment_service_manage"
  ON public.event_host_assignment
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.event_host_assignment (event_id, host_id, role, sort_order, is_primary)
SELECT id, host_id, 'host', 10, TRUE
FROM public.member_event
WHERE host_id IS NOT NULL
ON CONFLICT (event_id, host_id) DO NOTHING;
