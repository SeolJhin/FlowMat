-- Only run against the disposable browser CI database, never a development database.
BEGIN;

DO $$
BEGIN
    IF current_setting('flowmat.org_e2e_disposable', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Organization E2E fixtures require an explicitly disposable database session.';
    END IF;
END $$;

-- Reuse the public demo password hash without changing authentication or application permissions.
INSERT INTO users (
    user_id, user_name, user_nickname, user_email, user_pwd, user_birth,
    user_tel, email_verified_yn, failed_login_count
)
SELECT
    'org-e2e-member', 'Organization Fixture', 'org-e2e-member',
    'org-e2e-member@test.local', user_pwd, user_birth,
    '01099990001', 'Y', 0
FROM users WHERE user_id = 'demo-owner'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
