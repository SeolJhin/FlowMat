-- V50: Each change of an item's unit cost (docs/domain/material-cost.md "단가 이력"), with the cost before and after, from
-- this migration on. A cost of 0 or none means unknown; a save that keeps the cost writes no row.
CREATE TABLE IF NOT EXISTS item_cost_history (
    item_cost_history_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    previous_unit_cost numeric(14,4),
    unit_cost numeric(14,4),
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL,
    CONSTRAINT pk_item_cost_history PRIMARY KEY (item_cost_history_id),
    CONSTRAINT fk_item_cost_history_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_item_cost_history_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT ck_item_cost_history_costs
        CHECK ((previous_unit_cost IS NULL OR previous_unit_cost >= 0) AND (unit_cost IS NULL OR unit_cost >= 0))
);

CREATE INDEX IF NOT EXISTS ix_item_cost_history_item ON item_cost_history (item_id, changed_at);
