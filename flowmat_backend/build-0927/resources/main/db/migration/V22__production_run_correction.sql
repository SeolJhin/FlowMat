-- V22: Corrections of finished production runs (docs/domain/production-run-correction.md). A correction voids
-- recordings, adds recordings and/or changes the run's output quantity; the original rows stay for the audit trail.
CREATE TABLE IF NOT EXISTS production_run_correction (
    production_run_correction_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    production_run_id varchar(50) NOT NULL,
    correction_no integer NOT NULL,
    status varchar(30) NOT NULL,
    reason varchar(500) NOT NULL,
    requested_by varchar(50) NOT NULL,
    requested_at timestamptz NOT NULL,
    decided_by varchar(50),
    decided_at timestamptz,
    decision_note varchar(500),
    applied_at timestamptz,
    CONSTRAINT pk_production_run_correction PRIMARY KEY (production_run_correction_id),
    CONSTRAINT fk_production_run_correction_run FOREIGN KEY (production_run_id) REFERENCES production_run (production_run_id),
    CONSTRAINT ck_production_run_correction_status CHECK (status IN ('pending_approval', 'applied', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_production_run_correction_no
    ON production_run_correction (production_run_id, correction_no);

-- One correction waits for approval per run at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_production_run_correction_pending
    ON production_run_correction (production_run_id) WHERE status = 'pending_approval';

CREATE TABLE IF NOT EXISTS production_run_correction_line (
    production_run_correction_line_id varchar(50) NOT NULL,
    production_run_correction_id varchar(50) NOT NULL,
    line_no integer NOT NULL,
    line_kind varchar(30) NOT NULL,
    target_run_item_id varchar(50),
    direction varchar(10),
    item_id varchar(50),
    inventory_id varchar(50),
    qty numeric(14,4),
    unit varchar(20),
    before_qty numeric(14,4),
    after_qty numeric(14,4),
    created_run_item_id varchar(50),
    CONSTRAINT pk_production_run_correction_line PRIMARY KEY (production_run_correction_line_id),
    CONSTRAINT fk_production_run_correction_line_correction
        FOREIGN KEY (production_run_correction_id) REFERENCES production_run_correction (production_run_correction_id),
    CONSTRAINT fk_production_run_correction_line_target
        FOREIGN KEY (target_run_item_id) REFERENCES production_run_item (production_run_item_id),
    CONSTRAINT fk_production_run_correction_line_created
        FOREIGN KEY (created_run_item_id) REFERENCES production_run_item (production_run_item_id),
    CONSTRAINT ck_production_run_correction_line_kind CHECK (line_kind IN ('void_item', 'add_item', 'set_output_qty'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_production_run_correction_line_no
    ON production_run_correction_line (production_run_correction_id, line_no);

-- Which correction added a recording (quantity_source = 'correction') or voided one.
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS production_run_correction_id varchar(50);
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS cancelled_by_correction_id varchar(50);
ALTER TABLE production_run_item ADD CONSTRAINT fk_production_run_item_correction
    FOREIGN KEY (production_run_correction_id) REFERENCES production_run_correction (production_run_correction_id);
ALTER TABLE production_run_item ADD CONSTRAINT fk_production_run_item_cancelled_by_correction
    FOREIGN KEY (cancelled_by_correction_id) REFERENCES production_run_correction (production_run_correction_id);
