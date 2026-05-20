-- 20260520200000_member_podcast_token.sql
--
-- Adds a per-member podcast token used to authenticate private RSS feed access.
-- Each member gets a unique, stable UUID that forms their personal feed URL.
-- The token can be regenerated per-member (admin action) without affecting others.

ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS podcast_token uuid
    NOT NULL
    DEFAULT gen_random_uuid();

-- Unique index so we can look up a member by their token in O(1)
CREATE UNIQUE INDEX IF NOT EXISTS member_podcast_token_idx
  ON public.member (podcast_token);

COMMENT ON COLUMN public.member.podcast_token IS
  'Private RSS feed token. Used as the URL path segment for /api/podcast/{token}. '
  'Never expose in public-facing HTML. Regenerate if compromised.';
