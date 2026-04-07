-- Tracks which onboarding drip emails have been scheduled/sent per member.
-- Rows are inserted at checkout time (day=0 welcome already sent; days 3,7,14 queued).
-- A daily cron job processes rows where send_at <= now() and sent_at IS NULL.

CREATE TABLE IF NOT EXISTS public.onboarding_sequence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  email           text NOT NULL,
  day             smallint NOT NULL,             -- 0=welcome, 3=checkin, 7=week1, 14=twoweek
  send_at         timestamptz NOT NULL,          -- scheduled send time
  sent_at         timestamptz,                   -- null until actually sent
  failed          boolean NOT NULL DEFAULT false,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT onboarding_sequence_unique UNIQUE (member_id, day)
);

CREATE INDEX IF NOT EXISTS onboarding_sequence_pending_idx
  ON public.onboarding_sequence (send_at)
  WHERE sent_at IS NULL AND failed = false;

-- RLS: only service role (bypass) can read/write this table
ALTER TABLE public.onboarding_sequence ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default; no additional policies needed.
-- No member-facing reads required.
COMMENT ON TABLE public.onboarding_sequence IS
  'Drip onboarding email schedule. One row per (member, day). Processed by /api/cron/onboarding-drip daily.';
