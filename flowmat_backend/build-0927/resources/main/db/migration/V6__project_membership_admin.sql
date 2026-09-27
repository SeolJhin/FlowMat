INSERT INTO project_member (
    project_member_id,
    project_id,
    user_id,
    project_role,
    member_status,
    invited_by,
    joined_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid()::text,
    p.project_id,
    p.owner_id,
    'owner',
    'active',
    p.owner_id,
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM project p
WHERE p.deleted_yn = 'N'
  AND NOT EXISTS (
      SELECT 1
      FROM project_member pm
      WHERE pm.project_id = p.project_id
        AND pm.user_id = p.owner_id
        AND pm.member_status = 'active'
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_member_active_project_user
    ON project_member (project_id, user_id)
    WHERE member_status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_invite_token
    ON project_invite (invite_token);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_invite_pending_project_email
    ON project_invite (project_id, lower(invited_email))
    WHERE invite_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_project_member_project_status
    ON project_member (project_id, member_status);

CREATE INDEX IF NOT EXISTS idx_project_invite_project_status
    ON project_invite (project_id, invite_status);
