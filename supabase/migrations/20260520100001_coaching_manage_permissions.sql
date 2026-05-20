-- 20260520100001_coaching_manage_permissions.sql
-- Step 2 of 2: update role permission matrix and add platform_access column.
-- Runs after 20260520100000 commits the 'coaching.manage' enum value.

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

-- Add platform_access column to admin_user_role (staff member platform bypass)
ALTER TABLE public.admin_user_role
  ADD COLUMN IF NOT EXISTS platform_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_user_role.platform_access IS
  'When true, this staff member can access the member platform without a paid subscription.';
