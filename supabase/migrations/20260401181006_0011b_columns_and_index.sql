ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS tier_min subscription_tier;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS join_url TEXT;

CREATE INDEX IF NOT EXISTS idx_content_starts_at
  ON public.content (starts_at)
  WHERE status = 'published' AND type = 'coaching_call';;
