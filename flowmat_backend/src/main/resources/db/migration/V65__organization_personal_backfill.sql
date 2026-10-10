-- V65: ADR-001 Phase 2 (docs/domain/organization.md OR7): every user gets one personal organization they own, and every
-- project without an organization joins its owner's personal one. Idempotent; project_member rows are not touched, so
-- project access is exactly as before. Projects whose owner has no user row stay unlinked (Phase 3 reports them).
INSERT INTO organization (organization_id, organization_name, organization_type, owner_user_id, created_at, updated_at, deleted_yn)
SELECT 'org-' || substr(md5(u.user_id), 1, 32), left(u.user_name, 80) || '의 작업 공간', 'personal', u.user_id, now(), now(), 'N'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM organization o
                  WHERE o.owner_user_id = u.user_id AND o.organization_type = 'personal' AND o.deleted_yn = 'N');

INSERT INTO organization_member (organization_member_id, organization_id, user_id, org_role, member_status, joined_at)
SELECT 'orgm-' || substr(md5(o.organization_id || ':' || o.owner_user_id), 1, 32), o.organization_id, o.owner_user_id, 'owner',
       'active', now()
FROM organization o
WHERE o.organization_type = 'personal' AND o.deleted_yn = 'N'
  AND NOT EXISTS (SELECT 1 FROM organization_member m
                  WHERE m.organization_id = o.organization_id AND m.user_id = o.owner_user_id AND m.member_status = 'active');

UPDATE project p
SET organization_id = o.organization_id
FROM organization o
WHERE p.organization_id IS NULL AND o.owner_user_id = p.owner_id AND o.organization_type = 'personal' AND o.deleted_yn = 'N';
