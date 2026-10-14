-- Browser approval fixtures: opt in only on an isolated disposable database.
BEGIN;
DO $$
BEGIN
    IF current_setting('flowmat.approval_e2e_disposable', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Approval E2E fixtures require an explicitly disposable database session.';
    END IF;
END $$;

INSERT INTO users (user_id, user_name, user_nickname, user_email, user_pwd, user_birth, user_tel, email_verified_yn, failed_login_count)
SELECT f.id, f.name, f.id, f.id || '@test.local', u.user_pwd, u.user_birth, f.tel, 'Y', 0
FROM users u CROSS JOIN (VALUES
    ('approval-e2e-editor', 'Approval Editor', '01099990011'),
    ('approval-e2e-viewer', 'Approval Viewer', '01099990012')
) AS f(id, name, tel)
WHERE u.user_id = 'demo-owner'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO project (project_id, project_name, owner_id, organization_id)
SELECT f.id, f.name, 'demo-owner', p.organization_id
FROM project p CROSS JOIN (VALUES
    ('prj_approval_e2e', 'Approval Browser E2E'),
    ('prj_approval_revoked_e2e', 'Revoked Approval Browser E2E')
) AS f(id, name)
WHERE p.project_id = 'prj_demo_main'
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO project_member (project_member_id, project_id, user_id, project_role, member_status)
SELECT p.id || '-' || m.suffix, p.id, m.id, m.role, 'active'
FROM (VALUES ('prj_approval_e2e'), ('prj_approval_revoked_e2e')) AS p(id)
CROSS JOIN (VALUES
    ('demo-owner', 'owner', 'owner'),
    ('approval-e2e-editor', 'editor', 'editor'),
    ('approval-e2e-viewer', 'viewer', 'viewer')
) AS m(id, role, suffix)
ON CONFLICT (project_member_id) DO UPDATE SET member_status = 'active', project_role = EXCLUDED.project_role;
COMMIT;
