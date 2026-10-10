-- V66: Setup corrections of finished runs (docs/domain/equipment-setup-cost.md AS7-AS10). Each change of an equipment's
-- hourly rate is kept from now on, so a corrected setup can take the rate at the run's original finish; a run setup says
-- how its rate was set. Run correction lines can cancel or add a setup; V22's kind check is replaced here, not edited.
CREATE TABLE equipment_hourly_cost_history (
    equipment_hourly_cost_history_id varchar(50) PRIMARY KEY,
    equipment_id varchar(50) NOT NULL REFERENCES equipment(equipment_id),
    previous_hourly_cost numeric(14,4) CHECK (previous_hourly_cost IS NULL OR previous_hourly_cost >= 0),
    hourly_cost numeric(14,4) CHECK (hourly_cost IS NULL OR hourly_cost >= 0),
    version bigint NOT NULL CHECK (version >= 1),
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX ix_equipment_hourly_cost_history ON equipment_hourly_cost_history(equipment_id, changed_at);

ALTER TABLE production_run_setup ADD COLUMN IF NOT EXISTS rate_basis varchar(20) NOT NULL DEFAULT 'recorded';
ALTER TABLE production_run_setup ADD CONSTRAINT ck_production_run_setup_rate_basis
    CHECK (rate_basis IN ('recorded', 'historical', 'estimated'));

ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS target_run_setup_id varchar(50) REFERENCES production_run_setup(run_setup_id);
ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS equipment_id varchar(50) REFERENCES equipment(equipment_id);
ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS setup_minutes integer
    CHECK (setup_minutes IS NULL OR setup_minutes BETWEEN 1 AND 1440);
ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS created_run_setup_id varchar(50) REFERENCES production_run_setup(run_setup_id);
ALTER TABLE production_run_correction_line DROP CONSTRAINT ck_production_run_correction_line_kind;
ALTER TABLE production_run_correction_line ADD CONSTRAINT ck_production_run_correction_line_kind
    CHECK (line_kind IN ('void_item', 'add_item', 'set_output_qty', 'cancel_setup', 'add_setup'));
