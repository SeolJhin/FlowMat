CREATE TABLE flow_run_step (
    step_id varchar(50) PRIMARY KEY,
    flow_run_id varchar(50) NOT NULL REFERENCES flow_run(flow_run_id),
    node_id varchar(50) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('planned', 'running', 'completed', 'failed')),
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    scheduled_at timestamptz,
    started_at timestamptz,
    ended_at timestamptz,
    input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_snapshot jsonb,
    error_code varchar(100),
    error_message text,
    CONSTRAINT uq_flow_run_step_sequence UNIQUE (flow_run_id, sequence_no)
);

CREATE INDEX idx_flow_run_step_run_status ON flow_run_step (flow_run_id, status);

CREATE TABLE flow_run_step_attempt (
    attempt_id varchar(50) PRIMARY KEY,
    step_id varchar(50) NOT NULL REFERENCES flow_run_step(step_id),
    attempt_no integer NOT NULL CHECK (attempt_no > 0),
    status varchar(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    retry_at timestamptz,
    error_code varchar(100),
    error_message text,
    CONSTRAINT uq_flow_run_step_attempt_no UNIQUE (step_id, attempt_no)
);

CREATE TABLE flow_run_event (
    event_id varchar(50) PRIMARY KEY,
    flow_run_id varchar(50) NOT NULL REFERENCES flow_run(flow_run_id),
    step_id varchar(50) REFERENCES flow_run_step(step_id),
    event_type varchar(50) NOT NULL,
    payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id varchar(100),
    occurred_at timestamptz NOT NULL,
    actor_type varchar(20) NOT NULL CHECK (actor_type IN ('user', 'system')),
    actor_id varchar(50) NOT NULL
);

CREATE INDEX idx_flow_run_event_run_time ON flow_run_event (flow_run_id, occurred_at, event_id);
