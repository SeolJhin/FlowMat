-- V30: Nonconformities and corrective actions (docs/domain/nonconformity.md, benchmark FM-MFG-004 nonconformity /
-- corrective_action). A nonconformity report (NCR) gathers defects, records the root cause and what happens to the
-- product, and is closed once its actions are done.
CREATE TABLE IF NOT EXISTS nonconformity (
    nonconformity_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    ncr_no varchar(20) NOT NULL,
    title varchar(200) NOT NULL,
    description varchar(2000),
    severity varchar(20) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'open',
    item_id varchar(50),
    lot_id varchar(50),
    production_run_id varchar(50),
    root_cause varchar(2000),
    disposition varchar(30) NOT NULL DEFAULT 'pending',
    raised_by varchar(50) NOT NULL,
    raised_at timestamptz NOT NULL,
    closed_by varchar(50),
    closed_at timestamptz,
    closure_note varchar(1000),
    CONSTRAINT pk_nonconformity PRIMARY KEY (nonconformity_id),
    CONSTRAINT fk_nonconformity_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_nonconformity_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT fk_nonconformity_lot FOREIGN KEY (lot_id) REFERENCES lot_master (lot_id),
    CONSTRAINT fk_nonconformity_run FOREIGN KEY (production_run_id) REFERENCES production_run (production_run_id),
    CONSTRAINT ck_nonconformity_severity CHECK (severity IN ('minor', 'major', 'critical')),
    CONSTRAINT ck_nonconformity_status CHECK (status IN ('open', 'closed', 'cancelled')),
    CONSTRAINT ck_nonconformity_disposition
        CHECK (disposition IN ('pending', 'use_as_is', 'rework', 'scrap', 'return_to_supplier')),
    CONSTRAINT ck_nonconformity_closed CHECK ((status = 'open') = (closed_at IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nonconformity_no ON nonconformity (project_id, ncr_no);

-- A defect is on at most one nonconformity; cancelling a nonconformity removes its links.
CREATE TABLE IF NOT EXISTS nonconformity_defect (
    nonconformity_defect_id varchar(50) NOT NULL,
    nonconformity_id varchar(50) NOT NULL,
    defect_log_id varchar(50) NOT NULL,
    CONSTRAINT pk_nonconformity_defect PRIMARY KEY (nonconformity_defect_id),
    CONSTRAINT fk_nonconformity_defect_ncr FOREIGN KEY (nonconformity_id) REFERENCES nonconformity (nonconformity_id),
    CONSTRAINT fk_nonconformity_defect_defect FOREIGN KEY (defect_log_id) REFERENCES defect_log (defect_log_id),
    CONSTRAINT uq_nonconformity_defect UNIQUE (defect_log_id)
);

CREATE INDEX IF NOT EXISTS idx_nonconformity_defect_ncr ON nonconformity_defect (nonconformity_id);

CREATE TABLE IF NOT EXISTS corrective_action (
    corrective_action_id varchar(50) NOT NULL,
    nonconformity_id varchar(50) NOT NULL,
    action_no integer NOT NULL,
    action_type varchar(20) NOT NULL,
    description varchar(1000) NOT NULL,
    owner_id varchar(50),
    due_date date,
    status varchar(20) NOT NULL DEFAULT 'open',
    result_note varchar(1000),
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    finished_by varchar(50),
    finished_at timestamptz,
    CONSTRAINT pk_corrective_action PRIMARY KEY (corrective_action_id),
    CONSTRAINT fk_corrective_action_ncr FOREIGN KEY (nonconformity_id) REFERENCES nonconformity (nonconformity_id),
    CONSTRAINT ck_corrective_action_type CHECK (action_type IN ('correction', 'corrective', 'preventive')),
    CONSTRAINT ck_corrective_action_status CHECK (status IN ('open', 'done', 'cancelled')),
    CONSTRAINT ck_corrective_action_finished CHECK ((status = 'open') = (finished_at IS NULL)),
    CONSTRAINT uq_corrective_action_no UNIQUE (nonconformity_id, action_no)
);
