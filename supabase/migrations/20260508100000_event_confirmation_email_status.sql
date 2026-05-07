ALTER TABLE public.event_attendee
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_send_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_send_error TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_message_id TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_resend_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS event_attendee_confirmation_status_idx
  ON public.event_attendee(event_id, confirmation_sent_at, confirmation_send_attempted_at);
