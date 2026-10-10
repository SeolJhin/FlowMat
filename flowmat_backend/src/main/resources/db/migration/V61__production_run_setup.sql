-- V61: Actual setups of a production run, each with the equipment's hourly rate and rate version when it was recorded
-- (docs/domain/equipment-setup-cost.md AS1-AS6, DECISIONS-2026-10-05 section 4). Kept apart from material cost. Cancelled
-- rows stay for the record.
CREATE TABLE production_run_setup (
    run_setup_id varchar(50) PRIMARY KEY,
    production_run_id varchar(50) NOT NULL REFERENCES production_run(production_run_id),
    project_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL REFERENCES equipment(equipment_id),
    setup_minutes integer NOT NULL CHECK (setup_minutes BETWEEN 1 AND 1440),
    hourly_cost numeric(14,4) CHECK (hourly_cost IS NULL OR hourly_cost >= 0),
    hourly_cost_version bigint NOT NULL CHECK (hourly_cost_version >= 0),
    setup_cost numeric(18,4) CHECK (setup_cost IS NULL OR setup_cost >= 0),
    request_id uuid NOT NULL,
    note varchar(500),
    recorded_by varchar(50) NOT NULL,
    recorded_at timestamptz NOT NULL,
    cancelled_yn char(1) NOT NULL DEFAULT 'N' CHECK (cancelled_yn IN ('Y', 'N')),
    cancelled_by varchar(50),
    cancelled_at timestamptz,
    cancel_reason varchar(500),
    CONSTRAINT uq_production_run_setup_request UNIQUE (production_run_id, request_id),
    CONSTRAINT ck_production_run_setup_cost CHECK ((hourly_cost IS NULL) = (setup_cost IS NULL)),
    CONSTRAINT ck_production_run_setup_cancel CHECK (
        (cancelled_yn = 'N' AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
        OR (cancelled_yn = 'Y' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL))
);
CREATE INDEX ix_production_run_setup_run ON production_run_setup(production_run_id, recorded_at);
