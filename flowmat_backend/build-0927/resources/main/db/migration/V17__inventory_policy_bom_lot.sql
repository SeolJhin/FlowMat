-- Inventory / BOM / LOT v1 (docs/domain/inventory-bom-lot-contract.md).

-- 1. Stock invariants. NOT VALID: enforced for every new or updated row, without failing on rows that existed
--    before this migration. After checking existing data, run VALIDATE CONSTRAINT for each one.
ALTER TABLE inventory
    ADD CONSTRAINT ck_inventory_quantity_non_negative CHECK (quantity >= 0) NOT VALID;
ALTER TABLE inventory
    ADD CONSTRAINT ck_inventory_reserved_within_quantity
        CHECK (COALESCE(reserved_quantity, 0) >= 0 AND COALESCE(reserved_quantity, 0) <= quantity) NOT VALID;
ALTER TABLE inventory
    ADD CONSTRAINT ck_inventory_available_consistent
        CHECK (available_quantity IS NULL OR available_quantity = quantity - COALESCE(reserved_quantity, 0)) NOT VALID;

-- One stock row per item + location + lot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_item_location_lot
    ON inventory (project_id, item_id, COALESCE(location, ''), lot_id)
    WHERE lot_id IS NOT NULL AND deleted_yn = 'N';

-- 2. Inventory movements: idempotency key and one reversal per original transaction.
ALTER TABLE inventory_transaction ADD COLUMN IF NOT EXISTS request_id varchar(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_transaction_request
    ON inventory_transaction (project_id, request_id)
    WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_transaction_single_reversal
    ON inventory_transaction (reference_id)
    WHERE transaction_type = 'reversal';

-- Rename history rows to the v1 transaction types.
UPDATE inventory_transaction SET transaction_type = 'receipt' WHERE transaction_type = 'create';
UPDATE inventory_transaction SET transaction_type = 'adjustment' WHERE transaction_type IN ('adjust', 'delete');
UPDATE inventory_transaction SET transaction_type = 'production_input' WHERE transaction_type = 'run_input';
UPDATE inventory_transaction SET transaction_type = 'production_output' WHERE transaction_type = 'run_output';

-- 3. LOT numbers are unique within a project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lot_master_project_lot_no ON lot_master (project_id, lot_no);

-- 4. BOM revisions: one version number per target item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_header_revision
    ON bom_header (project_id, target_item_id, bom_version)
    WHERE deleted_yn = 'N';

-- 5. Values fixed on a production run when it starts from a BOM.
ALTER TABLE production_run ADD COLUMN IF NOT EXISTS bom_base_quantity numeric(14, 4);
ALTER TABLE production_run_item ADD COLUMN IF NOT EXISTS conversion_rate numeric(24, 12);

-- Rows recorded by hand were stored with the column default 'bom'; only BOM snapshots set it from now on.
UPDATE production_run_item SET quantity_source = 'manual' WHERE quantity_source = 'bom';
