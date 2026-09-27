-- V36: Stock allocated to work orders (docs/domain/stock-allocation.md, benchmark FM-WMS-003 reservation / allocation /
-- consumption). An allocation reserves a quantity of one stock record for one work order; a run of the order that takes
-- stock from the record turns the reservation into use, and what is left can be released.
CREATE TABLE IF NOT EXISTS stock_allocation (
    allocation_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    work_order_id varchar(50) NOT NULL,
    inventory_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    lot_id varchar(50),
    quantity numeric(14,4) NOT NULL,
    consumed_quantity numeric(14,4) NOT NULL DEFAULT 0,
    released_quantity numeric(14,4) NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'open',
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    closed_at timestamptz,
    CONSTRAINT pk_stock_allocation PRIMARY KEY (allocation_id),
    CONSTRAINT fk_stock_allocation_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_stock_allocation_work_order FOREIGN KEY (work_order_id) REFERENCES work_order (work_order_id),
    CONSTRAINT fk_stock_allocation_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (inventory_id),
    CONSTRAINT fk_stock_allocation_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT fk_stock_allocation_lot FOREIGN KEY (lot_id) REFERENCES lot_master (lot_id),
    CONSTRAINT ck_stock_allocation_status CHECK (status IN ('open', 'closed')),
    CONSTRAINT ck_stock_allocation_quantity CHECK (quantity > 0 AND consumed_quantity >= 0 AND released_quantity >= 0
        AND consumed_quantity + released_quantity <= quantity),
    CONSTRAINT ck_stock_allocation_closed CHECK ((status = 'open') = (closed_at IS NULL)),
    CONSTRAINT ck_stock_allocation_settled CHECK (status = 'open' OR consumed_quantity + released_quantity = quantity)
);

CREATE INDEX IF NOT EXISTS idx_stock_allocation_order ON stock_allocation (work_order_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_allocation_inventory ON stock_allocation (inventory_id) WHERE status = 'open';
