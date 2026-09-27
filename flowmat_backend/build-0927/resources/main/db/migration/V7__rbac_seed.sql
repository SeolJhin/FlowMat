-- Seed built-in system roles (idempotent)
INSERT INTO roles (role_id, role_name, role_description, role_is_system)
VALUES
    (gen_random_uuid(), 'admin', 'System administrator with full access', 'Y'),
    (gen_random_uuid(), 'user',  'Standard authenticated user',           'Y')
ON CONFLICT (role_name) DO NOTHING;

-- Seed permissions for admin role (idempotent via NOT EXISTS)
INSERT INTO role_permissions (role_permissions_id, role_id, resource, action, permission_code)
SELECT
    gen_random_uuid(),
    r.role_id,
    p.resource,
    p.action,
    p.permission_code
FROM roles r,
     (VALUES
         ('template', 'read_private', 'template:read_private'),
         ('template', 'manage',       'template:manage'),
         ('user',     'manage',       'user:manage'),
         ('project',  'view_all',     'project:view_all')
     ) AS p(resource, action, permission_code)
WHERE r.role_name = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_code = p.permission_code
  );

-- Backfill existing admin users from users.user_role field (idempotent)
INSERT INTO user_roles (user_roles_id, user_id, role_id, scope_type, granted_at)
SELECT
    gen_random_uuid(),
    u.id,
    r.role_id,
    'global',
    CURRENT_TIMESTAMP
FROM users u
JOIN roles r ON r.role_name = 'admin'
WHERE LOWER(TRIM(u.user_role)) = 'admin'
  AND u.id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = u.id
        AND ur.role_id = r.role_id
        AND ur.scope_type = 'global'
  );
