-- V45: A piece of equipment's shifts for one date in place of its weekly calendar (docs/domain/equipment-schedule.md
-- "날짜별 교대"): a closed day, a short day or work on a day off. One row per equipment and date. `shifts` lists the
-- shifts that start that day as "06:00-14:00,14:00-18:00" (at most six); empty means the equipment does not work that day.
CREATE TABLE IF NOT EXISTS equipment_day_override (
    override_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL,
    override_date date NOT NULL,
    shifts varchar(100) NOT NULL,
    reason varchar(200),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT pk_equipment_day_override PRIMARY KEY (override_id),
    CONSTRAINT uq_equipment_day_override_day UNIQUE (equipment_id, override_date),
    CONSTRAINT fk_equipment_day_override_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id),
    CONSTRAINT ck_equipment_day_override_shifts
        CHECK (shifts ~ '^([0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9](,[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]){0,5})?$')
);
