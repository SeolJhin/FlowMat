-- Node execution policy (docs/architecture/adr/ADR-004-flow-run-execution-policy.md,
-- docs/domain/flow-run-execution-policy.md EP1). Every value is NULL by default: a node without a policy runs as before.
ALTER TABLE process
    ADD COLUMN timeout_seconds integer,
    ADD COLUMN retry_limit integer,
    ADD COLUMN retry_delay_seconds integer,
    ADD COLUMN retry_backoff varchar(20),
    ADD COLUMN max_retry_delay_seconds integer,
    ADD COLUMN concurrency_limit integer,
    ADD COLUMN execution_policy_version bigint NOT NULL DEFAULT 0;

ALTER TABLE process
    ADD CONSTRAINT ck_process_timeout_seconds
        CHECK (timeout_seconds IS NULL OR timeout_seconds BETWEEN 1 AND 604800),
    ADD CONSTRAINT ck_process_retry_limit
        CHECK (retry_limit IS NULL OR retry_limit BETWEEN 0 AND 10),
    ADD CONSTRAINT ck_process_retry_delay_seconds
        CHECK (retry_delay_seconds IS NULL OR retry_delay_seconds BETWEEN 0 AND 86400),
    ADD CONSTRAINT ck_process_retry_backoff
        CHECK (retry_backoff IS NULL OR retry_backoff IN ('fixed', 'exponential')),
    ADD CONSTRAINT ck_process_max_retry_delay_seconds
        CHECK (max_retry_delay_seconds IS NULL OR (retry_backoff = 'exponential'
            AND max_retry_delay_seconds BETWEEN COALESCE(retry_delay_seconds, 0) AND 604800)),
    ADD CONSTRAINT ck_process_concurrency_limit
        CHECK (concurrency_limit IS NULL OR concurrency_limit BETWEEN 1 AND 1000),
    ADD CONSTRAINT ck_process_execution_policy_version
        CHECK (execution_policy_version >= 0);

-- When a running attempt of a graph run times out (EP7); NULL when its node has no time limit.
ALTER TABLE flow_run_step_attempt
    ADD COLUMN timeout_at timestamptz;

ALTER TABLE flow_run_step_attempt
    ADD CONSTRAINT ck_flow_run_step_attempt_timeout CHECK (timeout_at IS NULL OR timeout_at > started_at);

-- The timeout sweep reads only running attempts that have a deadline.
CREATE INDEX idx_flow_run_attempt_timeout
    ON flow_run_step_attempt (timeout_at)
    WHERE status = 'running' AND timeout_at IS NOT NULL;

-- The concurrency limit counts running steps of one node (EP6).
CREATE INDEX idx_flow_run_step_running_node
    ON flow_run_step (node_id)
    WHERE status = 'running';
