-- V52: Owner schedule commands and immutable before/after history; no existing work order is changed.
CREATE TABLE work_order_reschedule (
    change_id varchar(50) PRIMARY KEY,
    work_order_id varchar(50) NOT NULL REFERENCES work_order(work_order_id),
    request_id uuid NOT NULL,
    previous_planned_start_at timestamptz,
    previous_planned_end_at timestamptz,
    planned_start_at timestamptz,
    planned_end_at timestamptz,
    reason varchar(1000) NOT NULL CHECK (length(btrim(reason)) > 0),
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL,
    CONSTRAINT uq_work_order_reschedule_request UNIQUE(work_order_id, request_id),
    CONSTRAINT ck_work_order_reschedule_dates CHECK (planned_end_at >= planned_start_at)
);
CREATE INDEX ix_work_order_reschedule_history ON work_order_reschedule(work_order_id, changed_at DESC, change_id DESC);