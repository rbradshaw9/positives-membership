ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS send_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_replay_email boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.email_reminder_dispatch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (
    reminder_kind IN (
      'event_24h',
      'event_1h',
      'event_replay',
      'coaching_24h',
      'coaching_1h',
      'coaching_replay'
    )
  ),
  activecampaign_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_dispatch_unique
  ON public.email_reminder_dispatch (member_id, content_id, reminder_kind);

ALTER TABLE public.email_reminder_dispatch ENABLE ROW LEVEL SECURITY;
