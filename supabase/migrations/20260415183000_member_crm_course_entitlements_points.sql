-- Member CRM, course entitlements, points ledger, and admin role foundation.
-- This migration intentionally separates subscription access from permanent
-- course ownership so course-only members and migrated buyers can be supported.

DO $$
BEGIN
  CREATE TYPE course_entitlement_source AS ENUM (
    'purchase',
    'migration',
    'admin_grant',
    'points_unlock',
    'gift'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE course_entitlement_status AS ENUM (
    'active',
    'revoked',
    'refunded',
    'chargeback'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE member_followup_status AS ENUM (
    'none',
    'needs_followup',
    'waiting_on_member',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE points_ledger_reason AS ENUM (
    'daily_practice',
    'journal_entry',
    'course_lesson_complete',
    'course_complete',
    'community_post',
    'community_reply',
    'event_attended',
    'course_unlock',
    'admin_adjustment',
    'reversal'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE admin_role_key AS ENUM (
    'super_admin',
    'admin',
    'coach',
    'support',
    'readonly'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE admin_permission_key AS ENUM (
    'members.read',
    'members.update_profile',
    'members.update_lifecycle',
    'members.manage_billing',
    'courses.grant',
    'courses.revoke',
    'points.adjust',
    'notes.write',
    'documents.write',
    'roles.manage',
    'audit.read'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'course_lesson_completed';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'course_completed';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'community_post_created';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'community_reply_created';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'event_joined';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'course_unlocked';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'admin_course_granted';
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'admin_course_revoked';

ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS assigned_coach_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS followup_status member_followup_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS followup_note text,
  ADD COLUMN IF NOT EXISTS followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_member_ref text;

CREATE INDEX IF NOT EXISTS idx_member_assigned_coach_id
  ON public.member (assigned_coach_id);

CREATE INDEX IF NOT EXISTS idx_member_followup_status
  ON public.member (followup_status);

CREATE INDEX IF NOT EXISTS idx_member_last_seen_at
  ON public.member (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_legacy_member_ref
  ON public.member (legacy_member_ref);

ALTER TABLE public.course
  ADD COLUMN IF NOT EXISTS points_price integer,
  ADD COLUMN IF NOT EXISTS points_unlock_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.course.points_price IS
  'Point cost for unlocking this course. Default model is 1 point = $1.';

CREATE TABLE IF NOT EXISTS public.course_entitlement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  source course_entitlement_source NOT NULL,
  status course_entitlement_status NOT NULL DEFAULT 'active',
  granted_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  revoked_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  grant_note text,
  revoke_note text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  legacy_source text,
  legacy_ref text,
  purchased_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_entitlement_active_unique
  ON public.course_entitlement (member_id, course_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_course_entitlement_member
  ON public.course_entitlement (member_id, status);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_course
  ON public.course_entitlement (course_id, status);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_source
  ON public.course_entitlement (source);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_legacy_ref
  ON public.course_entitlement (legacy_ref);

ALTER TABLE public.course_entitlement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own course entitlements"
  ON public.course_entitlement FOR SELECT
  USING (member_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.member_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta <> 0),
  reason points_ledger_reason NOT NULL,
  description text,
  course_id uuid REFERENCES public.course(id) ON DELETE SET NULL,
  content_id uuid REFERENCES public.content(id) ON DELETE SET NULL,
  activity_event_id uuid REFERENCES public.activity_event(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_points_ledger_idempotency
  ON public.member_points_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_member_created
  ON public.member_points_ledger (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_reason
  ON public.member_points_ledger (reason);

ALTER TABLE public.member_points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own points ledger"
  ON public.member_points_ledger FOR SELECT
  USING (member_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.member_admin_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  author_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  followup_status member_followup_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_admin_note_member
  ON public.member_admin_note (member_id, pinned DESC, created_at DESC);

ALTER TABLE public.member_admin_note ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.member_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_name text,
  storage_path text,
  external_url text,
  content_type text,
  size_bytes bigint,
  internal_only boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_document_member
  ON public.member_document (member_id, created_at DESC);

ALTER TABLE public.member_document ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.member_access_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_access_override_member
  ON public.member_access_override (member_id, active, ends_at);

ALTER TABLE public.member_access_override ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.member_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  target_member_id uuid REFERENCES public.member(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT 'member',
  target_id text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_audit_log_target
  ON public.member_audit_log (target_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_audit_log_actor
  ON public.member_audit_log (actor_member_id, created_at DESC);

ALTER TABLE public.member_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key admin_role_key NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permission (
  role_id uuid NOT NULL REFERENCES public.admin_role(id) ON DELETE CASCADE,
  permission admin_permission_key NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission)
);

CREATE TABLE IF NOT EXISTS public.admin_user_role (
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.admin_role(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.admin_user_permission_override (
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  permission admin_permission_key NOT NULL,
  allowed boolean NOT NULL,
  updated_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, permission)
);

ALTER TABLE public.admin_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permission_override ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_role (key, name, description)
VALUES
  ('super_admin', 'Super Admin', 'Full platform administration.'),
  ('admin', 'Admin', 'Member, content, access, and support operations.'),
  ('coach', 'Coach', 'Assigned member support, coaching notes, and documents.'),
  ('support', 'Support', 'Member lookup, notes, and support triage.'),
  ('readonly', 'Read Only', 'Read-only operational visibility.')
ON CONFLICT (key) DO UPDATE
SET name = excluded.name,
    description = excluded.description;

WITH roles AS (
  SELECT id, key FROM public.admin_role
),
role_permissions AS (
  SELECT id AS role_id, unnest(ARRAY[
    'members.read',
    'members.update_profile',
    'members.update_lifecycle',
    'members.manage_billing',
    'courses.grant',
    'courses.revoke',
    'points.adjust',
    'notes.write',
    'documents.write',
    'roles.manage',
    'audit.read'
  ]::admin_permission_key[]) AS permission
  FROM roles
  WHERE key = 'super_admin'

  UNION ALL
  SELECT id, unnest(ARRAY[
    'members.read',
    'members.update_profile',
    'members.update_lifecycle',
    'members.manage_billing',
    'courses.grant',
    'courses.revoke',
    'points.adjust',
    'notes.write',
    'documents.write',
    'audit.read'
  ]::admin_permission_key[])
  FROM roles
  WHERE key = 'admin'

  UNION ALL
  SELECT id, unnest(ARRAY[
    'members.read',
    'notes.write',
    'documents.write',
    'audit.read'
  ]::admin_permission_key[])
  FROM roles
  WHERE key = 'coach'

  UNION ALL
  SELECT id, unnest(ARRAY[
    'members.read',
    'members.update_profile',
    'notes.write',
    'audit.read'
  ]::admin_permission_key[])
  FROM roles
  WHERE key = 'support'

  UNION ALL
  SELECT id, unnest(ARRAY[
    'members.read',
    'audit.read'
  ]::admin_permission_key[])
  FROM roles
  WHERE key = 'readonly'
)
INSERT INTO public.admin_role_permission (role_id, permission)
SELECT role_id, permission FROM role_permissions
ON CONFLICT (role_id, permission) DO NOTHING;

DROP TRIGGER IF EXISTS course_entitlement_updated_at ON public.course_entitlement;
CREATE TRIGGER course_entitlement_updated_at
  BEFORE UPDATE ON public.course_entitlement
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS member_admin_note_updated_at ON public.member_admin_note;
CREATE TRIGGER member_admin_note_updated_at
  BEFORE UPDATE ON public.member_admin_note
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS member_access_override_updated_at ON public.member_access_override;
CREATE TRIGGER member_access_override_updated_at
  BEFORE UPDATE ON public.member_access_override
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
