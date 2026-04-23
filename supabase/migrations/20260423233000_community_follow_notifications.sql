DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'community_notification_event_type'
  ) THEN
    CREATE TYPE community_notification_event_type AS ENUM (
      'reply_to_my_post',
      'reply_in_followed_thread'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_follow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.community_thread(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (member_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follow_member_created
  ON public.community_follow (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_follow_thread_member
  ON public.community_follow (thread_id, member_id);

CREATE TABLE IF NOT EXISTS public.community_notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.community_thread(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_post(id) ON DELETE CASCADE,
  actor_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  event_type community_notification_event_type NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_community_notification_member_read_created
  ON public.community_notification (member_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_notification_thread_member
  ON public.community_notification (thread_id, member_id, created_at DESC);

ALTER TABLE public.community_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_follow: select own rows"
  ON public.community_follow FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_follow: insert own rows"
  ON public.community_follow FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.member
      WHERE member.id = auth.uid()
        AND member.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "community_follow: delete own rows"
  ON public.community_follow FOR DELETE
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_notification: select own rows"
  ON public.community_notification FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "community_notification: update own rows"
  ON public.community_notification FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

INSERT INTO public.community_follow (member_id, thread_id, created_at)
SELECT thread.member_id, thread.id, thread.created_at
FROM public.community_thread AS thread
WHERE thread.member_id IS NOT NULL
ON CONFLICT (member_id, thread_id) DO NOTHING;
