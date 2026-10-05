-- The stock ledger is read by project over time: the movement search's keyset pages (newest first, then id), a
-- period's in and out, stock at a past moment and the analysis windows (docs/domain/stock-ledger.md). One index on
-- project, time and id serves those range scans in both directions. The single-column project index stays.
CREATE INDEX IF NOT EXISTS idx_inventory_transaction_project_created
    ON inventory_transaction (project_id, created_at, inventory_transaction_id);
