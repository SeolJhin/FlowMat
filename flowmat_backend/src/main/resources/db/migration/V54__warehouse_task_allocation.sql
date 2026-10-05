-- V54: Link reserved pick tasks to their production allocation. Existing free-stock tasks stay unchanged.
ALTER TABLE warehouse_task ADD COLUMN allocation_id varchar(50) REFERENCES stock_allocation(allocation_id);
ALTER TABLE warehouse_task ADD CONSTRAINT ck_warehouse_task_allocation CHECK
    (allocation_id IS NULL OR (task_type = 'pick' AND work_order_id IS NOT NULL));
CREATE INDEX ix_warehouse_task_open_allocation ON warehouse_task(allocation_id) WHERE status = 'open' AND allocation_id IS NOT NULL;
