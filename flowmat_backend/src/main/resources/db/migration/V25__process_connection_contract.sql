ALTER TABLE process_connection
    ADD COLUMN condition_expr text,
    ADD COLUMN capacity numeric(19, 4),
    ADD COLUMN failure_policy varchar(30) NOT NULL DEFAULT 'stop',
    ADD CONSTRAINT ck_process_connection_capacity CHECK (capacity IS NULL OR capacity >= 0),
    ADD CONSTRAINT ck_process_connection_failure_policy
        CHECK (failure_policy IN ('stop', 'skip', 'retry'));
