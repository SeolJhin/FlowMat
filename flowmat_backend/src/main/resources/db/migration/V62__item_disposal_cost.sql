-- V62: What disposing of one unit of an item costs, apart from its unit cost (docs/domain/bom-by-products.md WD1-WD6,
-- DECISIONS-2026-10-05 section 4), and each change of it. Null is unknown; zero is known free disposal.
CREATE TABLE item_disposal_cost (
    item_id varchar(50) PRIMARY KEY REFERENCES item(item_id),
    disposal_cost numeric(14,4) CHECK (disposal_cost IS NULL OR disposal_cost >= 0),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE item_disposal_cost_history (
    item_disposal_cost_history_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    item_id varchar(50) NOT NULL REFERENCES item(item_id),
    previous_disposal_cost numeric(14,4) CHECK (previous_disposal_cost IS NULL OR previous_disposal_cost >= 0),
    disposal_cost numeric(14,4) CHECK (disposal_cost IS NULL OR disposal_cost >= 0),
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL
);
CREATE INDEX ix_item_disposal_cost_history_item ON item_disposal_cost_history(item_id, changed_at);
