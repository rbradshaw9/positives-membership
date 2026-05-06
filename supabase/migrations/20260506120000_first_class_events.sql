CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.event_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2EC4B6',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_host (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  email TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_venue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  website_url TEXT,
  map_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_virtual BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  recurrence_frequency TEXT NOT NULL CHECK (recurrence_frequency IN ('daily', 'weekly', 'monthly')),
  recurrence_interval INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  occurrence_count INTEGER,
  recurrence_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.member_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES public.event_series(id) ON DELETE SET NULL,
  type_id UUID REFERENCES public.event_type(id) ON DELETE SET NULL,
  host_id UUID REFERENCES public.event_host(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.event_venue(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  description TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_for_review', 'published', 'canceled', 'postponed', 'archived')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'member' CHECK (visibility IN ('member', 'hidden')),
  virtual_mode TEXT NOT NULL DEFAULT 'none' CHECK (virtual_mode IN ('none', 'manual', 'zoom')),
  manual_join_url TEXT,
  replay_url TEXT,
  replay_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS public.member_event_access_level (
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  subscription_tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, subscription_tier)
);

CREATE TABLE IF NOT EXISTS public.zoom_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_member_id UUID REFERENCES public.member(id) ON DELETE SET NULL,
  owner_kind TEXT NOT NULL DEFAULT 'platform' CHECK (owner_kind IN ('platform', 'coach')),
  label TEXT NOT NULL,
  zoom_account_id TEXT,
  zoom_user_id TEXT,
  zoom_user_email TEXT,
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reconnect', 'disabled')),
  last_connected_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_zoom_meeting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  zoom_connection_id UUID REFERENCES public.zoom_connection(id) ON DELETE SET NULL,
  zoom_object_type TEXT NOT NULL DEFAULT 'meeting' CHECK (zoom_object_type IN ('meeting', 'webinar')),
  zoom_object_id TEXT,
  topic TEXT,
  join_url TEXT,
  start_url_ciphertext TEXT,
  host_email TEXT,
  provider_status TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS public.zoom_oauth_state (
  state TEXT PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_kind TEXT NOT NULL DEFAULT 'platform' CHECK (owner_kind IN ('platform', 'coach')),
  return_to TEXT NOT NULL DEFAULT '/admin/integrations/zoom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_event_starts_at ON public.member_event (starts_at);
CREATE INDEX IF NOT EXISTS idx_member_event_status_starts_at ON public.member_event (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_member_event_type_id ON public.member_event (type_id);
CREATE INDEX IF NOT EXISTS idx_member_event_host_id ON public.member_event (host_id);
CREATE INDEX IF NOT EXISTS idx_member_event_venue_id ON public.member_event (venue_id);
CREATE INDEX IF NOT EXISTS idx_member_event_access_level_tier ON public.member_event_access_level (subscription_tier, event_id);
CREATE INDEX IF NOT EXISTS idx_zoom_connection_status ON public.zoom_connection (status);
CREATE INDEX IF NOT EXISTS idx_event_zoom_meeting_connection ON public.event_zoom_meeting (zoom_connection_id);
CREATE INDEX IF NOT EXISTS idx_zoom_oauth_state_expires ON public.zoom_oauth_state (expires_at);

INSERT INTO public.event_type (slug, name, description, color, sort_order)
VALUES
  ('member-event', 'Member Event', 'Live member event for selected Positives membership levels.', '#2EC4B6', 10),
  ('workshop', 'Workshop', 'Guided workshop or practice session.', '#44A8D8', 20),
  ('qa', 'Q&A', 'Question-and-answer session.', '#F4A261', 30),
  ('webinar', 'Webinar', 'Structured online presentation or webinar.', '#8A6BF1', 40)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

ALTER TABLE public.event_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_host ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_venue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_event_access_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_zoom_meeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_oauth_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event reference rows are readable by authenticated users"
  ON public.event_type FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "event hosts are readable by authenticated users"
  ON public.event_host FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "event venues are readable by authenticated users"
  ON public.event_venue FOR SELECT
  TO authenticated
  USING (is_active = TRUE);
