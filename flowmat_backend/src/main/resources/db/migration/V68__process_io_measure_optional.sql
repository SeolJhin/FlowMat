-- Port quantity and unit are optional outside material and product ports
-- (docs/architecture/adr/ADR-005-port-measurement-and-validation.md decision 1, docs/domain/port-measurement.md PM1).
-- The service still requires them where a manufacturing domain needs them. Existing rows keep their values.
ALTER TABLE process_io ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE process_io ALTER COLUMN unit DROP NOT NULL;
