-- LiveKit event streaming and replay tracking.
--
-- This migration keeps Zoom/manual events working while adding a first-class
-- LiveKit webinar mode for member_event.

ALTER TABLE public.member_event
  DROP CONSTRAINT IF EXISTS member_event_virtual_mode_check,
  ADD CONSTRAINT member_event_virtual_mode_check
    CHECK (virtual_mode IN ('none', 'manual', 'zoom', 'livekit'));

ALTER TABLE public.member_event
  ADD COLUMN IF NOT EXISTS replay_asset_id UUID REFERENCES public.media_asset(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.event_livekit_room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'webinar' CHECK (mode IN ('webinar')),
  recording_policy TEXT NOT NULL DEFAULT 'auto' CHECK (recording_policy IN ('auto', 'manual', 'none')),
  room_status TEXT NOT NULL DEFAULT 'provisioned' CHECK (room_status IN ('provisioned', 'started', 'finished', 'failed')),
  egress_id TEXT,
  egress_status TEXT CHECK (egress_status IS NULL OR egress_status IN ('pending', 'starting', 'active', 'complete', 'failed', 'aborted', 'limit_reached')),
  replay_asset_id UUID REFERENCES public.media_asset(id) ON DELETE SET NULL,
  last_error TEXT,
  room_started_at TIMESTAMPTZ,
  room_finished_at TIMESTAMPTZ,
  egress_started_at TIMESTAMPTZ,
  egress_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id)
);

CREATE TABLE IF NOT EXISTS public.livekit_webhook_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livekit_event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  room_name TEXT,
  participant_identity TEXT,
  egress_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_livekit_room_event
  ON public.event_livekit_room(event_id);

CREATE INDEX IF NOT EXISTS idx_event_livekit_room_room_status
  ON public.event_livekit_room(room_name, room_status);

CREATE INDEX IF NOT EXISTS idx_event_livekit_room_egress
  ON public.event_livekit_room(egress_id)
  WHERE egress_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_livekit_webhook_event_room
  ON public.livekit_webhook_event(room_name, created_at DESC);

DROP TRIGGER IF EXISTS event_livekit_room_updated_at ON public.event_livekit_room;
CREATE TRIGGER event_livekit_room_updated_at
  BEFORE UPDATE ON public.event_livekit_room
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_livekit_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livekit_webhook_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_livekit_room_authenticated_read" ON public.event_livekit_room;
CREATE POLICY "event_livekit_room_authenticated_read"
  ON public.event_livekit_room
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "event_livekit_room_service_manage" ON public.event_livekit_room;
CREATE POLICY "event_livekit_room_service_manage"
  ON public.event_livekit_room
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "livekit_webhook_event_service_manage" ON public.livekit_webhook_event;
CREATE POLICY "livekit_webhook_event_service_manage"
  ON public.livekit_webhook_event
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.event_livekit_room IS
  'LiveKit room and recording lifecycle for member events using virtual_mode=livekit.';

COMMENT ON TABLE public.livekit_webhook_event IS
  'Idempotent ledger of LiveKit webhook payloads received by the app.';
