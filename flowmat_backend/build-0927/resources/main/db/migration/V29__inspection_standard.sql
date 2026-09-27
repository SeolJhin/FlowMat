-- V29: Inspection standards (docs/domain/inspection-standard.md, benchmark FM-MFG-004 validation_plan/validation_check).
-- Per item, the checks to run, their limits and whether every production run of the item must record the check. An
-- inspection can name the standard it followed.
CREATE TABLE IF NOT EXISTS inspection_standard (
    standard_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    inspection_type varchar(50) NOT NULL,
    stage varchar(20) NOT NULL DEFAULT 'production',
    standard_min numeric(14,4),
    standard_max numeric(14,4),
    unit varchar(20),
    required_yn char(1) NOT NULL DEFAULT 'N',
    active_yn char(1) NOT NULL DEFAULT 'Y',
    note varchar(500),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_inspection_standard PRIMARY KEY (standard_id),
    CONSTRAINT fk_inspection_standard_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_inspection_standard_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT ck_inspection_standard_stage CHECK (stage IN ('receipt', 'production', 'any')),
    CONSTRAINT ck_inspection_standard_limits
        CHECK (standard_min IS NULL OR standard_max IS NULL OR standard_min <= standard_max),
    CONSTRAINT ck_inspection_standard_required CHECK (required_yn IN ('Y', 'N')),
    CONSTRAINT ck_inspection_standard_active CHECK (active_yn IN ('Y', 'N')),
    CONSTRAINT ck_inspection_standard_deleted CHECK (deleted_yn IN ('Y', 'N'))
);

-- One standard per item, check (ignoring case) and stage; overlap with 'any' is refused by the service.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspection_standard_check
    ON inspection_standard (item_id, lower(inspection_type), stage) WHERE deleted_yn = 'N';
CREATE INDEX IF NOT EXISTS idx_inspection_standard_project ON inspection_standard (project_id);

ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS standard_id varchar(50);
ALTER TABLE quality_inspection ADD CONSTRAINT fk_quality_inspection_standard
    FOREIGN KEY (standard_id) REFERENCES inspection_standard (standard_id);
