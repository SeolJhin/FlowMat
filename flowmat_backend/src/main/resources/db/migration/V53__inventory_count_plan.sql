-- V53: Server-held stock count snapshots and row recount checkpoints. Existing stock and counts are unchanged.
CREATE TABLE inventory_count_plan (
    plan_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    request_id uuid NOT NULL,
    blind boolean NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'recount_required', 'submitted')),
    note varchar(500),
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    submitted_by varchar(50),
    submitted_at timestamptz,
    count_id varchar(50),
    CONSTRAINT uq_inventory_count_plan_request UNIQUE(project_id, request_id)
);
CREATE INDEX ix_inventory_count_plan_project ON inventory_count_plan(project_id, created_at DESC);
CREATE TABLE inventory_count_plan_line (
    line_id varchar(50) PRIMARY KEY,
    plan_id varchar(50) NOT NULL REFERENCES inventory_count_plan(plan_id),
    inventory_id varchar(50) NOT NULL REFERENCES inventory(inventory_id),
    item_id varchar(50) NOT NULL,
    lot_id varchar(50),
    location varchar(100),
    baseline_quantity numeric(14,4) NOT NULL CHECK (baseline_quantity >= 0),
    baseline_version bigint NOT NULL,
    checkpoint_quantity numeric(14,4) NOT NULL CHECK (checkpoint_quantity >= 0),
    checkpoint_version bigint NOT NULL,
    counted_quantity numeric(14,4) CHECK (counted_quantity >= 0),
    requires_recount boolean NOT NULL DEFAULT false,
    counted_by varchar(50),
    counted_at timestamptz,
    entry_version bigint NOT NULL DEFAULT 0,
    CONSTRAINT uq_inventory_count_plan_record UNIQUE(plan_id, inventory_id)
);