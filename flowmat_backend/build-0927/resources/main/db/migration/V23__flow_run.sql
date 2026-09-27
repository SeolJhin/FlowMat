CREATE TABLE flow_run (
    flow_run_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    workflow_id varchar(50) NOT NULL REFERENCES workflow(workflow_id),
    workflow_revision_id varchar(50) NOT NULL REFERENCES workflow_revision(workflow_revision_id),
    production_run_id varchar(50) UNIQUE REFERENCES production_run(production_run_id),
    run_type varchar(20) NOT NULL CHECK (run_type IN ('actual', 'simulation', 'test', 'dry_run')),
    status varchar(20) NOT NULL CHECK (status IN ('running', 'finished', 'cancelled', 'failed')),
    input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_payload jsonb,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    requested_by varchar(50) NOT NULL,
    CONSTRAINT ck_flow_run_end_time CHECK (
        (status = 'running' AND ended_at IS NULL)
        OR (status <> 'running' AND ended_at IS NOT NULL)
    )
);

CREATE INDEX idx_flow_run_workflow_started ON flow_run (workflow_id, started_at DESC);
CREATE INDEX idx_flow_run_revision ON flow_run (workflow_revision_id);
