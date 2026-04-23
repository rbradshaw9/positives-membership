-- Community value refresh
-- Refactors the old weekly-only Q&A feed into a thread-first community model
-- with curated topics, saves, reports, and moderation tooling.

ALTER TYPE admin_permission_key ADD VALUE IF NOT EXISTS 'community.moderate';

DO $$
BEGIN
  CREATE TYPE community_thread_source_type AS ENUM (
    'weekly_principle',
    'standalone'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE community_moderation_status AS ENUM (
    'visible',
    'hidden',
    'removed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE community_report_reason AS ENUM (
    'safety',
    'spam',
    'harassment',
    'misinformation',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE community_report_status AS ENUM (
    'open',
    'reviewing',
    'resolved',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.community_thread (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  source_type community_thread_source_type NOT NULL,
  content_id uuid REFERENCES public.content(id) ON DELETE CASCADE,
  title text,
  body text NOT NULL,
  post_type community_post_type NOT NULL DEFAULT 'reflection',
  moderation_status community_moderation_status NOT NULL DEFAULT 'visible',
  is_pinned boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (source_type = 'weekly_principle' AND content_id IS NOT NULL)
    OR source_type = 'standalone'
  )
);

CREATE INDEX IF NOT EXISTS idx_community_thread_source_content
  ON public.community_thread (source_type, content_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_thread_moderation_activity
  ON public.community_thread (moderation_status, is_pinned DESC, is_featured DESC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_thread_member
  ON public.community_thread (member_id, created_at DESC);

ALTER TABLE public.community_post
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.community_thread(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS depth integer,
  ADD COLUMN IF NOT EXISTS moderation_status community_moderation_status NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS is_official_answer boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_community_post_thread_id
  ON public.community_post (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_post_thread_parent
  ON public.community_post (thread_id, parent_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.community_tag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_tag_active_sort
  ON public.community_tag (is_active, sort_order, label);

CREATE TABLE IF NOT EXISTS public.community_thread_tag (
  thread_id uuid NOT NULL REFERENCES public.community_thread(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.community_tag(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_community_thread_tag_tag
  ON public.community_thread_tag (tag_id, thread_id);

CREATE TABLE IF NOT EXISTS public.community_thread_like (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.community_thread(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_community_thread_like_thread
  ON public.community_thread_like (thread_id);

CREATE INDEX IF NOT EXISTS idx_community_thread_like_member
  ON public.community_thread_like (member_id);

CREATE TABLE IF NOT EXISTS public.community_saved_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.community_thread(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_post(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (member_id, thread_id, post_id),
  CHECK (
    (thread_id IS NOT NULL AND post_id IS NULL)
    OR (thread_id IS NULL AND post_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_community_saved_item_member_created
  ON public.community_saved_item (member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.community_thread(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_post(id) ON DELETE CASCADE,
  reason community_report_reason NOT NULL DEFAULT 'other',
  details text,
  status community_report_status NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  moderator_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (thread_id IS NOT NULL AND post_id IS NULL)
    OR (thread_id IS NULL AND post_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_community_report_status_created
  ON public.community_report (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_report_member
  ON public.community_report (member_id, created_at DESC);

ALTER TABLE public.community_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_thread_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_thread_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saved_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post: select for active members" ON public.community_post;
DROP POLICY IF EXISTS "community_post: insert own rows" ON public.community_post;
DROP POLICY IF EXISTS "community_post: update own rows" ON public.community_post;
DROP POLICY IF EXISTS "community_post: delete own rows" ON public.community_post;

CREATE POLICY "community_thread: select for active members"
  ON public.community_thread FOR SELECT
  TO authenticated
  USING (
    moderation_status = 'visible'
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_thread: insert own rows"
  ON public.community_thread FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_thread: delete own rows"
  ON public.community_thread FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_post: select visible for active members"
  ON public.community_post FOR SELECT
  TO authenticated
  USING (
    moderation_status = 'visible'
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_post: insert own rows"
  ON public.community_post FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_post: delete own rows"
  ON public.community_post FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_tag: select active tags"
  ON public.community_tag FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_thread_tag: select for active members"
  ON public.community_thread_tag FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
    AND EXISTS (
      SELECT 1
      FROM public.community_thread
      WHERE community_thread.id = community_thread_tag.thread_id
        AND community_thread.moderation_status = 'visible'
    )
  );

CREATE POLICY "community_thread_like: select for all authenticated"
  ON public.community_thread_like FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "community_thread_like: insert own rows"
  ON public.community_thread_like FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_thread_like: delete own rows"
  ON public.community_thread_like FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_saved_item: select own rows"
  ON public.community_saved_item FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_saved_item: insert own rows"
  ON public.community_saved_item FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "community_saved_item: delete own rows"
  ON public.community_saved_item FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_report: insert own rows"
  ON public.community_report FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_report: select own rows"
  ON public.community_report FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

INSERT INTO public.community_tag (slug, label, description, sort_order)
VALUES
  ('daily-practice', 'Daily Practice', 'What is landing in the rhythm of your day-to-day practice.', 10),
  ('mindset', 'Mindset', 'Beliefs, reframes, and inner shifts worth talking through.', 20),
  ('relationships', 'Relationships', 'Connection, boundaries, family, and relational patterns.', 30),
  ('healing', 'Healing', 'Gentle conversations around growth, recovery, and next steps.', 40),
  ('wins', 'Wins', 'Moments of traction, gratitude, and progress worth celebrating.', 50),
  ('questions', 'Questions', 'Open questions for the community, coaches, or support team.', 60)
ON CONFLICT (slug) DO UPDATE
SET label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;

INSERT INTO public.community_thread (
  id,
  member_id,
  source_type,
  content_id,
  title,
  body,
  post_type,
  moderation_status,
  is_pinned,
  is_featured,
  last_activity_at,
  created_at,
  updated_at
)
SELECT
  post.id,
  post.member_id,
  'weekly_principle'::community_thread_source_type,
  post.content_id,
  NULL,
  post.body,
  post.post_type,
  'visible'::community_moderation_status,
  COALESCE(post.is_pinned, false),
  false,
  GREATEST(
    post.created_at,
    COALESCE((
      SELECT MAX(child.created_at)
      FROM public.community_post child
      WHERE child.parent_id = post.id
    ), post.created_at)
  ),
  post.created_at,
  post.created_at
FROM public.community_post post
WHERE post.parent_id IS NULL
ON CONFLICT (id) DO NOTHING;

WITH RECURSIVE thread_tree AS (
  SELECT
    root.id AS post_id,
    root.id AS root_thread_id,
    0 AS depth
  FROM public.community_post root
  WHERE root.parent_id IS NULL

  UNION ALL

  SELECT
    child.id AS post_id,
    thread_tree.root_thread_id,
    thread_tree.depth + 1
  FROM public.community_post child
  JOIN thread_tree
    ON child.parent_id = thread_tree.post_id
)
UPDATE public.community_post AS post
SET
  thread_id = thread_tree.root_thread_id,
  depth = LEAST(thread_tree.depth, 2),
  parent_id = CASE
    WHEN thread_tree.depth = 1 THEN NULL
    ELSE post.parent_id
  END,
  moderation_status = 'visible',
  is_official_answer = COALESCE(post.is_admin_answer, false)
FROM thread_tree
WHERE post.id = thread_tree.post_id
  AND thread_tree.depth > 0;

INSERT INTO public.community_thread_like (thread_id, member_id, created_at)
SELECT
  likes.post_id,
  likes.member_id,
  likes.created_at
FROM public.community_post_like likes
JOIN public.community_thread thread
  ON thread.id = likes.post_id
ON CONFLICT (thread_id, member_id) DO NOTHING;

DELETE FROM public.community_post_like likes
USING public.community_thread thread
WHERE likes.post_id = thread.id;

DELETE FROM public.community_post post
USING public.community_thread thread
WHERE post.id = thread.id;

UPDATE public.community_thread thread
SET last_activity_at = GREATEST(
  thread.created_at,
  COALESCE(reply_stats.latest_reply_at, thread.created_at)
)
FROM (
  SELECT thread_id, MAX(created_at) AS latest_reply_at
  FROM public.community_post
  WHERE thread_id IS NOT NULL
  GROUP BY thread_id
) AS reply_stats
WHERE thread.id = reply_stats.thread_id;

ALTER TABLE public.community_post
  ALTER COLUMN thread_id SET NOT NULL,
  ALTER COLUMN depth SET NOT NULL;

INSERT INTO public.admin_role_permission (role_id, permission)
SELECT role.id, 'community.moderate'::admin_permission_key
FROM public.admin_role role
WHERE role.key IN ('super_admin', 'admin', 'coach', 'support')
ON CONFLICT (role_id, permission) DO NOTHING;

DROP TRIGGER IF EXISTS community_thread_updated_at ON public.community_thread;
CREATE TRIGGER community_thread_updated_at
  BEFORE UPDATE ON public.community_thread
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS community_tag_updated_at ON public.community_tag;
CREATE TRIGGER community_tag_updated_at
  BEFORE UPDATE ON public.community_tag
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS community_report_updated_at ON public.community_report;
CREATE TRIGGER community_report_updated_at
  BEFORE UPDATE ON public.community_report
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
