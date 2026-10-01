ALTER TABLE flow_run
    ADD COLUMN execution_mode varchar(20) NOT NULL DEFAULT 'manual';

ALTER TABLE flow_run
    ADD CONSTRAINT ck_flow_run_execution_mode
    CHECK (execution_mode IN ('manual', 'graph'));

ALTER TABLE flow_run_step
    ADD COLUMN source_connection_id varchar(50);

ALTER TABLE flow_run_step
    DROP CONSTRAINT ck_flow_run_step_status;

ALTER TABLE flow_run_step
    ADD CONSTRAINT ck_flow_run_step_status
    CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled', 'skipped'));
