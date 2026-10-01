-- A routed step must identify the exact upstream attempt-bearing step within its run.
ALTER TABLE flow_run_step
    ADD COLUMN source_step_id varchar(50);

ALTER TABLE flow_run_step
    ADD CONSTRAINT uq_flow_run_step_id_run UNIQUE (step_id, flow_run_id);

ALTER TABLE flow_run_step
    ADD CONSTRAINT fk_flow_run_step_source_same_run
    FOREIGN KEY (source_step_id, flow_run_id)
    REFERENCES flow_run_step (step_id, flow_run_id);

CREATE INDEX idx_flow_run_step_source ON flow_run_step (source_step_id);
