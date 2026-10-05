-- V42: A port's item is an optional binding (docs/architecture/adr/ADR-003-resource-port-contract.md, decision 4).
-- Material ports may still name a catalog item; data, file and API ports describe what flows with schema_json instead.
-- Existing rows keep their item.
ALTER TABLE process_io ALTER COLUMN item_id DROP NOT NULL;
