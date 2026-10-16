-- V84: Equipment efficiency (docs/domain/equipment.md "효율", FM-PLAN-002): the share of its rated output per hour the
-- equipment really reaches, above 0 and at most 100 percent. Null means 100, so every existing plan keeps its hours.
ALTER TABLE equipment
    ADD COLUMN efficiency_percent numeric(5,2),
    ADD CONSTRAINT ck_equipment_efficiency CHECK (efficiency_percent IS NULL OR (efficiency_percent > 0 AND efficiency_percent <= 100));
