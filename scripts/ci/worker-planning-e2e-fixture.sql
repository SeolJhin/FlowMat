-- Use only on an explicitly disposable worker-planning E2E database session.
BEGIN;
DO $$
BEGIN
    IF current_setting('flowmat.worker_e2e_disposable', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Worker E2E fixtures require an explicitly disposable database session.';
    END IF;
END $$;

INSERT INTO users (user_id, user_name, user_nickname, user_email, user_pwd, user_birth, user_tel, email_verified_yn, failed_login_count)
SELECT f.id, f.name, f.id, f.id || '@test.local', u.user_pwd, u.user_birth, f.tel, 'Y', 0
FROM users u CROSS JOIN (VALUES
    ('worker-e2e-editor', 'Worker Editor', '01099990021'),
    ('worker-e2e-viewer', 'Worker Viewer', '01099990022')
) AS f(id, name, tel)
WHERE u.user_id = 'demo-owner'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO project (project_id, project_name, owner_id, organization_id)
SELECT 'prj_worker_e2e', 'Worker Planning E2E', 'demo-owner', p.organization_id
FROM project p WHERE p.project_id = 'prj_demo_main'
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO project_member (project_member_id, project_id, user_id, project_role, member_status)
SELECT 'worker-e2e-' || m.suffix, 'prj_worker_e2e', m.id, m.role, 'active'
FROM (VALUES
    ('demo-owner', 'owner', 'owner'),
    ('worker-e2e-editor', 'editor', 'editor'),
    ('worker-e2e-viewer', 'viewer', 'viewer')
) AS m(id, role, suffix)
ON CONFLICT (project_member_id) DO UPDATE SET member_status = 'active', project_role = EXCLUDED.project_role;
COMMIT;
