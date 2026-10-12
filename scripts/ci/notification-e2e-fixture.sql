-- Dedicated notification browser fixture. Explicit opt-in; never use a development database.
-- Set PGOPTIONS='-c flowmat.notification_e2e_disposable=true' only for the disposable CI database.
BEGIN;

DO $$
BEGIN
    IF current_setting('flowmat.notification_e2e_disposable', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Notification E2E fixtures require an explicitly disposable database session.';
    END IF;
END $$;

-- Reuse the public demo password hash; do not modify authentication or permissions.
INSERT INTO users (
    user_id, user_name, user_nickname, user_email, user_pwd, user_birth,
    user_tel, email_verified_yn, failed_login_count
)
SELECT
    'notification-e2e-member', 'Notification Fixture', 'notification-e2e-member',
    'notification-e2e-member@test.local', user_pwd, user_birth,
    '01099990002', 'Y', 0
FROM users WHERE user_id = 'demo-owner'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO project (project_id, project_name, owner_id, organization_id)
SELECT 'prj_notification_e2e', 'Notification E2E', 'demo-owner', organization_id
FROM project WHERE project_id = 'prj_demo_main'
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO project_member (project_member_id, project_id, user_id, project_role, member_status)
VALUES
    ('ntf-e2e-owner', 'prj_notification_e2e', 'demo-owner', 'owner', 'active'),
    ('ntf-e2e-member', 'prj_notification_e2e', 'notification-e2e-member', 'viewer', 'active')
ON CONFLICT (project_member_id) DO UPDATE SET member_status = 'active';

COMMIT;
