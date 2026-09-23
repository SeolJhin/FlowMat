-- V14: add columns that JPA entities already map but earlier migrations never created.
-- Without them every query on these entities failed with "column ... does not exist"
-- (admin role list, user role lookup, project invite list/create).
-- Found by FlowMatSmokeTest running Hibernate schema validation (ddl-auto=validate).

-- updated_at: backfill existing rows from created_at, then default new rows to now.
ALTER TABLE project_invite ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE project_invite SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE project_invite ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE roles SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE roles ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE coupon ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE coupon SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE coupon ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE promotion ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
UPDATE promotion SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE promotion ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS permission_description varchar(255);
