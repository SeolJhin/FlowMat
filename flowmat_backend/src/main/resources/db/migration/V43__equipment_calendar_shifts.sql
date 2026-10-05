-- V43: An equipment calendar can hold several shifts, each repeated on its own ISO days (docs/domain/equipment-schedule.md
-- "교대", benchmark FM-PLAN-003): two or three shifts a day, or a shorter Saturday shift. Each row is now one shift.
-- Existing calendars become one shift each, keyed by their equipment id.
ALTER TABLE equipment_calendar ADD COLUMN shift_id varchar(50);
UPDATE equipment_calendar SET shift_id = equipment_id WHERE shift_id IS NULL;
ALTER TABLE equipment_calendar ALTER COLUMN shift_id SET NOT NULL;
ALTER TABLE equipment_calendar DROP CONSTRAINT pk_equipment_calendar;
ALTER TABLE equipment_calendar ADD CONSTRAINT pk_equipment_calendar PRIMARY KEY (shift_id);
CREATE INDEX IF NOT EXISTS idx_equipment_calendar_equipment ON equipment_calendar (equipment_id);
