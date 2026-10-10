-- The phantom sub-assembly a planned run line was expanded through (docs/domain/multi-level-bom.md P2-P3); NULL for a
-- line of the run's own BOM and for recordings. Like item_id, it names an item without a foreign key.
ALTER TABLE production_run_item ADD COLUMN via_item_id varchar(50);
