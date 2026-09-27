-- V28: Storage location master (docs/domain/storage-location.md, benchmark FM-WMS-001). A project lists its sites,
-- warehouses, zones, locations and bins as a tree. Once a project lists any, new stock can only be placed at an
-- active listed location; inventory.location keeps the location code as text, so existing rows stay valid.
CREATE TABLE IF NOT EXISTS storage_location (
    location_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    parent_location_id varchar(50),
    location_code varchar(100) NOT NULL,
    location_name varchar(100),
    location_type varchar(20) NOT NULL,
    active_yn char(1) NOT NULL DEFAULT 'Y',
    note varchar(500),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_storage_location PRIMARY KEY (location_id),
    CONSTRAINT fk_storage_location_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_storage_location_parent FOREIGN KEY (parent_location_id) REFERENCES storage_location (location_id),
    CONSTRAINT ck_storage_location_type CHECK (location_type IN ('site', 'warehouse', 'zone', 'location', 'bin')),
    CONSTRAINT ck_storage_location_active CHECK (active_yn IN ('Y', 'N')),
    CONSTRAINT ck_storage_location_deleted CHECK (deleted_yn IN ('Y', 'N')),
    CONSTRAINT ck_storage_location_not_own_parent CHECK (parent_location_id IS NULL OR parent_location_id <> location_id)
);

-- Codes are matched case-insensitively against inventory.location, so keep them unique that way per project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_location_code
    ON storage_location (project_id, lower(location_code)) WHERE deleted_yn = 'N';

CREATE INDEX IF NOT EXISTS idx_storage_location_parent ON storage_location (parent_location_id);
