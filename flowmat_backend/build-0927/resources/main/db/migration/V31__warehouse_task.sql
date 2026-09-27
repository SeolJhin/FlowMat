-- V31: Warehouse tasks (docs/domain/warehouse-task.md, benchmark FM-WMS-002 putaway/pick). A task plans moving a quantity
-- of one stock record to a place; doing it records an ordinary transfer, so stock still moves only through the stock
-- commands.
CREATE TABLE IF NOT EXISTS warehouse_task (
    task_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    task_no varchar(20) NOT NULL,
    task_type varchar(20) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'open',
    inventory_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    lot_id varchar(50),
    quantity numeric(14,4) NOT NULL,
    from_location varchar(100),
    to_location varchar(100) NOT NULL,
    work_order_id varchar(50),
    note varchar(500),
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    finished_by varchar(50),
    finished_at timestamptz,
    transfer_id varchar(50),
    cancel_reason varchar(500),
    CONSTRAINT pk_warehouse_task PRIMARY KEY (task_id),
    CONSTRAINT fk_warehouse_task_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_warehouse_task_inventory FOREIGN KEY (inventory_id) REFERENCES inventory (inventory_id),
    CONSTRAINT fk_warehouse_task_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT fk_warehouse_task_lot FOREIGN KEY (lot_id) REFERENCES lot_master (lot_id),
    CONSTRAINT fk_warehouse_task_work_order FOREIGN KEY (work_order_id) REFERENCES work_order (work_order_id),
    CONSTRAINT ck_warehouse_task_type CHECK (task_type IN ('putaway', 'pick')),
    CONSTRAINT ck_warehouse_task_status CHECK (status IN ('open', 'done', 'cancelled')),
    CONSTRAINT ck_warehouse_task_quantity CHECK (quantity > 0),
    CONSTRAINT ck_warehouse_task_finished CHECK ((status = 'open') = (finished_at IS NULL)),
    CONSTRAINT ck_warehouse_task_transfer CHECK (status <> 'done' OR transfer_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_task_no ON warehouse_task (project_id, task_no);
CREATE INDEX IF NOT EXISTS idx_warehouse_task_project_status ON warehouse_task (project_id, status);
