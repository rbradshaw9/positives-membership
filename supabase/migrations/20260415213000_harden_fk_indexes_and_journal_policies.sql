-- Advisor hardening pass after the member CRM / lifecycle refactor.
-- Adds covering indexes for foreign keys reported by the Supabase performance
-- advisor and removes exact duplicate journal RLS policies.

CREATE INDEX IF NOT EXISTS idx_activity_event_content_id
  ON public.activity_event (content_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_permission_override_updated_by
  ON public.admin_user_permission_override (updated_by);

CREATE INDEX IF NOT EXISTS idx_admin_user_role_assigned_by
  ON public.admin_user_role (assigned_by);

CREATE INDEX IF NOT EXISTS idx_admin_user_role_role_id
  ON public.admin_user_role (role_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_link_member_id
  ON public.affiliate_link (member_id);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_granted_by
  ON public.course_entitlement (granted_by);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_revoked_by
  ON public.course_entitlement (revoked_by);

CREATE INDEX IF NOT EXISTS idx_course_lesson_module_id
  ON public.course_lesson (module_id);

CREATE INDEX IF NOT EXISTS idx_course_session_lesson_id
  ON public.course_session (lesson_id);

CREATE INDEX IF NOT EXISTS idx_email_reminder_dispatch_content_id
  ON public.email_reminder_dispatch (content_id);

CREATE INDEX IF NOT EXISTS idx_journal_content_id
  ON public.journal (content_id);

CREATE INDEX IF NOT EXISTS idx_member_access_override_granted_by
  ON public.member_access_override (granted_by);

CREATE INDEX IF NOT EXISTS idx_member_admin_note_author_member_id
  ON public.member_admin_note (author_member_id);

CREATE INDEX IF NOT EXISTS idx_member_document_uploaded_by
  ON public.member_document (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_activity_event_id
  ON public.member_points_ledger (activity_event_id);

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_content_id
  ON public.member_points_ledger (content_id);

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_course_id
  ON public.member_points_ledger (course_id);

CREATE INDEX IF NOT EXISTS idx_member_points_ledger_created_by
  ON public.member_points_ledger (created_by);

CREATE INDEX IF NOT EXISTS idx_support_submissions_member_id
  ON public.support_submissions (member_id);

CREATE INDEX IF NOT EXISTS idx_video_views_content_id
  ON public.video_views (content_id);

CREATE INDEX IF NOT EXISTS idx_video_views_course_lesson_id
  ON public.video_views (course_lesson_id);

DROP POLICY IF EXISTS "journal: members insert own" ON public.journal;
DROP POLICY IF EXISTS "journal: members select own" ON public.journal;
DROP POLICY IF EXISTS "journal: members update own" ON public.journal;
