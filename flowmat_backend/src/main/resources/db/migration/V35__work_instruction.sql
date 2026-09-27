-- V35: Work instructions and run checklists (docs/domain/work-instruction.md, benchmark FM-MFG-003). A product has
-- instruction revisions (draft → released → retired) made of numbered steps; a production run of the product works
-- through the released revision's steps, and each confirmation is kept with who and when.
CREATE TABLE IF NOT EXISTS work_instruction (
    instruction_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    revision_no integer NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'draft',
    title varchar(200) NOT NULL,
    body text,
    document_url varchar(500),
    released_by varchar(50),
    released_at timestamptz,
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_work_instruction PRIMARY KEY (instruction_id),
    CONSTRAINT fk_work_instruction_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_work_instruction_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT ck_work_instruction_status CHECK (status IN ('draft', 'released', 'retired')),
    CONSTRAINT ck_work_instruction_revision CHECK (revision_no > 0),
    CONSTRAINT ck_work_instruction_deleted CHECK (deleted_yn IN ('Y', 'N'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_instruction_revision ON work_instruction (item_id, revision_no) WHERE deleted_yn = 'N';
-- At most one released and one draft revision per product.
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_instruction_released ON work_instruction (item_id) WHERE status = 'released' AND deleted_yn = 'N';
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_instruction_draft ON work_instruction (item_id) WHERE status = 'draft' AND deleted_yn = 'N';

CREATE TABLE IF NOT EXISTS work_instruction_step (
    step_id varchar(50) NOT NULL,
    instruction_id varchar(50) NOT NULL,
    step_no integer NOT NULL,
    step_text varchar(500) NOT NULL,
    required_yn char(1) NOT NULL DEFAULT 'Y',
    records_value_yn char(1) NOT NULL DEFAULT 'N',
    value_label varchar(100),
    CONSTRAINT pk_work_instruction_step PRIMARY KEY (step_id),
    CONSTRAINT fk_work_instruction_step_instruction FOREIGN KEY (instruction_id) REFERENCES work_instruction (instruction_id),
    CONSTRAINT ck_work_instruction_step_no CHECK (step_no > 0),
    CONSTRAINT ck_work_instruction_step_required CHECK (required_yn IN ('Y', 'N')),
    CONSTRAINT ck_work_instruction_step_value CHECK (records_value_yn IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS idx_work_instruction_step ON work_instruction_step (instruction_id, step_no);

CREATE TABLE IF NOT EXISTS run_instruction_check (
    check_id varchar(50) NOT NULL,
    production_run_id varchar(50) NOT NULL,
    instruction_id varchar(50) NOT NULL,
    step_id varchar(50) NOT NULL,
    check_value varchar(200),
    note varchar(500),
    checked_by varchar(50) NOT NULL,
    checked_at timestamptz NOT NULL,
    CONSTRAINT pk_run_instruction_check PRIMARY KEY (check_id),
    CONSTRAINT fk_run_instruction_check_run FOREIGN KEY (production_run_id) REFERENCES production_run (production_run_id),
    CONSTRAINT fk_run_instruction_check_instruction FOREIGN KEY (instruction_id) REFERENCES work_instruction (instruction_id),
    CONSTRAINT fk_run_instruction_check_step FOREIGN KEY (step_id) REFERENCES work_instruction_step (step_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_run_instruction_check ON run_instruction_check (production_run_id, step_id);
