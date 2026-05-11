WITH roles AS (
  SELECT id, key FROM public.admin_role
),
role_permissions AS (
  SELECT id AS role_id, 'members.send_login_link'::admin_permission_key AS permission
  FROM roles
  WHERE key IN ('super_admin', 'admin', 'support')
)
INSERT INTO public.admin_role_permission (role_id, permission)
SELECT role_id, permission FROM role_permissions
ON CONFLICT (role_id, permission) DO NOTHING;
