-- V64: Organizations above projects, ADR-001 Phase 1 (docs/domain/organization.md OR1). Organization membership never
-- grants project access; project_member stays the source of truth. project.organization_id stays nullable (Phase 3 leaves
-- NOT NULL undecided).
CREATE TABLE organization (
    organization_id varchar(50) PRIMARY KEY,
    organization_name varchar(100) NOT NULL,
    organization_type varchar(20) NOT NULL CHECK (organization_type IN ('personal', 'team')),
    owner_user_id varchar(50) NOT NULL REFERENCES users(user_id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_yn char(1) NOT NULL DEFAULT 'N' CHECK (deleted_yn IN ('Y', 'N'))
);
CREATE UNIQUE INDEX uq_organization_personal ON organization(owner_user_id)
    WHERE organization_type = 'personal' AND deleted_yn = 'N';

CREATE TABLE organization_member (
    organization_member_id varchar(50) PRIMARY KEY,
    organization_id varchar(50) NOT NULL REFERENCES organization(organization_id),
    user_id varchar(50) NOT NULL REFERENCES users(user_id),
    org_role varchar(20) NOT NULL CHECK (org_role IN ('owner', 'admin', 'member')),
    member_status varchar(20) NOT NULL CHECK (member_status IN ('active', 'left', 'removed')),
    joined_at timestamptz NOT NULL,
    left_at timestamptz,
    CONSTRAINT ck_organization_member_left CHECK ((member_status = 'active') = (left_at IS NULL))
);
CREATE UNIQUE INDEX uq_organization_member_active ON organization_member(organization_id, user_id) WHERE member_status = 'active';
CREATE INDEX ix_organization_member_user ON organization_member(user_id) WHERE member_status = 'active';

ALTER TABLE project ADD COLUMN IF NOT EXISTS organization_id varchar(50) REFERENCES organization(organization_id);
CREATE INDEX ix_project_organization ON project(organization_id);
