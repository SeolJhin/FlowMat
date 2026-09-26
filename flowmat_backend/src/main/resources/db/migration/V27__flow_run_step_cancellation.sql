ALTER TABLE flow_run_step DROP CONSTRAINT flow_run_step_status_check;
ALTER TABLE flow_run_step ADD CONSTRAINT ck_flow_run_step_status
    CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE flow_run_step_attempt DROP CONSTRAINT flow_run_step_attempt_status_check;
ALTER TABLE flow_run_step_attempt ADD CONSTRAINT ck_flow_run_step_attempt_status
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));
