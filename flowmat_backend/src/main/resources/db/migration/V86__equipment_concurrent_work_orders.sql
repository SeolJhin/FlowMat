-- V86: Equipment that runs several work orders at once (docs/domain/equipment.md E12-E15), such as an oven or a tank farm.
-- N keeps one at a time, as before: plans keep its orders apart and readiness warns of overlaps. Y lets them overlap.
ALTER TABLE equipment
    ADD COLUMN concurrent_work_orders_yn char(1) NOT NULL DEFAULT 'N',
    ADD CONSTRAINT ck_equipment_concurrent_work_orders CHECK (concurrent_work_orders_yn IN ('Y', 'N'));
