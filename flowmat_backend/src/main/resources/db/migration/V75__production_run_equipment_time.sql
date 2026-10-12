-- V75: Equipment running time of a production run, each with the equipment's hourly rate and rate version when it was
-- recorded (docs/domain/equipment-setup-cost.md ER1-ER7; user decision 2026-10-12: recorded, prefilled from the run's
-- time, kept apart from material cost). Same shape as production_run_setup (V61); cancelled rows stay for the record.
CREATE TABLE production_run_equipment_time (
    run_equipment_time_id varchar(50) PRIMARY KEY,
    production_run_id varchar(50) NOT NULL REFERENCES production_run(production_run_id),
    project_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL REFERENCES equipment(equipment_id),
    running_minutes integer NOT NULL CHECK (running_minutes BETWEEN 1 AND 10080),
    hourly_cost numeric(14,4) CHECK (hourly_cost IS NULL OR hourly_cost >= 0),
    hourly_cost_version bigint NOT NULL CHECK (hourly_cost_version >= 0),
    running_cost numeric(18,4) CHECK (running_cost IS NULL OR running_cost >= 0),
    request_id uuid NOT NULL,
    note varchar(500),
    recorded_by varchar(50) NOT NULL,
    recorded_at timestamptz NOT NULL,
    cancelled_yn char(1) NOT NULL DEFAULT 'N' CHECK (cancelled_yn IN ('Y', 'N')),
    cancelled_by varchar(50),
    cancelled_at timestamptz,
    cancel_reason varchar(500),
    CONSTRAINT uq_production_run_equipment_time_request UNIQUE (production_run_id, request_id),
    CONSTRAINT ck_production_run_equipment_time_cost CHECK ((hourly_cost IS NULL) = (running_cost IS NULL)),
    CONSTRAINT ck_production_run_equipment_time_cancel CHECK (
        (cancelled_yn = 'N' AND cancelled_by IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
        OR (cancelled_yn = 'Y' AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL))
);
CREATE INDEX ix_production_run_equipment_time_run ON production_run_equipment_time(production_run_id, recorded_at);
