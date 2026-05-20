-- 20260520100000_coaching_manage_permission.sql
--
-- 1. Add coaching.manage to the admin_permission_key enum
-- 2. Fix the role/permission matrix:
--      - coach  loses members.read, gains coaching.manage
--      - admin / super_admin gain coaching.manage
--      - community.moderate and members.send_login_link confirmed on admin/super_admin
-- 3. Add platform_access column to admin_user_role (staff member platform bypass)

-- ── 1. Enum value ─────────────────────────────────────────────────────────────

ALTER TYPE admin_permission_key ADD VALUE IF NOT EXISTS 'coaching.manage';

-- ── 2. Role permissions ───────────────────────────────────────────────────────

-- Remove members.read from coach role
DELETE FROM public.admin_role_permission
WHERE role_id = (SELECT id FROM public.admin_role WHERE key = 'coach')
  AND permission = 'members.read';

-- Grant coaching.manage to super_admin, admin, coach
INSERT INTO public.admin_role_permission (role_id, permission)
SELECT r.id, 'coaching.manage'::admin_permission_key
FROM public.admin_role r
WHERE r.key IN ('super_admin', 'admin', 'coach')
ON CONFLICT (role_id, permission) DO NOTHING;

-- Ensure community.moderate is on super_admin and admin
INSERT INTO public.admin_role_permission (role_id, permission)
SELECT r.id, 'community.moderate'::admin_permission_key
FROM public.admin_role r
WHERE r.key IN ('super_admin', 'admin')
ON CONFLICT (role_id, permission) DO NOTHING;

-- Ensure members.send_login_link is on super_admin, admin, support
INSERT INTO public.admin_role_permission (role_id, permission)
SELECT r.id, 'members.send_login_link'::admin_permission_key
FROM public.admin_role r
WHERE r.key IN ('super_admin', 'admin', 'support')
ON CONFLICT (role_id, permission) DO NOTHING;

-- ── 3. Platform access column ─────────────────────────────────────────────────

ALTER TABLE public.admin_user_role
  ADD COLUMN IF NOT EXISTS platform_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_user_role.platform_access IS
  'When true, this staff member can access the member platform (/today etc.) '
  'without a paid subscription. Granted per-person by a super_admin or admin.';
