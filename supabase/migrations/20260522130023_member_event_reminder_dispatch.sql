CREATE TABLE IF NOT EXISTS public.member_event_reminder_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.member_event(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (
    reminder_kind IN (
      'event_24h',
      'event_1h',
      'event_replay'
    )
  ),
  activecampaign_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_event_reminder_dispatch_unique
  ON public.member_event_reminder_dispatch (member_id, event_id, reminder_kind);

CREATE INDEX IF NOT EXISTS idx_member_event_reminder_dispatch_event
  ON public.member_event_reminder_dispatch (event_id, created_at DESC);

ALTER TABLE public.member_event_reminder_dispatch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_event_reminder_dispatch_service_manage"
  ON public.member_event_reminder_dispatch;
CREATE POLICY "member_event_reminder_dispatch_service_manage"
  ON public.member_event_reminder_dispatch
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
