-- 20260520100000_coaching_manage_permission.sql
-- Step 1 of 2: add the enum value.
-- Must be committed before the value can be used in queries (Postgres limitation).
-- See 20260520100001_coaching_manage_permissions.sql for the role/column changes.

ALTER TYPE admin_permission_key ADD VALUE IF NOT EXISTS 'coaching.manage';
