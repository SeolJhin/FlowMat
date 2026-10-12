-- V76: Running-time corrections of finished runs (docs/domain/equipment-setup-cost.md ER10-ER13). Like a setup (V66), a
-- run's running time says how its rate was set; run correction lines can cancel or add running time, reusing V66's
-- equipment_id for the added time. V66's kind check is replaced here, not edited.
ALTER TABLE production_run_equipment_time ADD COLUMN IF NOT EXISTS rate_basis varchar(20) NOT NULL DEFAULT 'recorded';
ALTER TABLE production_run_equipment_time ADD CONSTRAINT ck_production_run_equipment_time_rate_basis
    CHECK (rate_basis IN ('recorded', 'historical', 'estimated'));

ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS target_run_equipment_time_id varchar(50)
    REFERENCES production_run_equipment_time(run_equipment_time_id);
ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS running_minutes integer
    CHECK (running_minutes IS NULL OR running_minutes BETWEEN 1 AND 10080);
ALTER TABLE production_run_correction_line ADD COLUMN IF NOT EXISTS created_run_equipment_time_id varchar(50)
    REFERENCES production_run_equipment_time(run_equipment_time_id);
ALTER TABLE production_run_correction_line DROP CONSTRAINT ck_production_run_correction_line_kind;
ALTER TABLE production_run_correction_line ADD CONSTRAINT ck_production_run_correction_line_kind
    CHECK (line_kind IN ('void_item', 'add_item', 'set_output_qty', 'cancel_setup', 'add_setup', 'cancel_running_time',
        'add_running_time'));
