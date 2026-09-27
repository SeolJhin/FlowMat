-- V32: Equipment calendars, downtime and the equipment a work order runs on (docs/domain/equipment-schedule.md,
-- benchmark FM-PLAN-002/003). Work order readiness uses them to check whether the equipment has the time the order
-- needs in its planned window.

-- One working shift per equipment, repeated on the listed ISO days (1 = Monday). A shift that ends at or before it
-- starts runs past midnight; equal times mean all day. Equipment without a row is always available.
CREATE TABLE IF NOT EXISTS equipment_calendar (
    equipment_id varchar(50) NOT NULL,
    shift_start time NOT NULL,
    shift_end time NOT NULL,
    work_days varchar(20) NOT NULL,
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT pk_equipment_calendar PRIMARY KEY (equipment_id),
    CONSTRAINT fk_equipment_calendar_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id),
    CONSTRAINT ck_equipment_calendar_days CHECK (work_days ~ '^[1-7](,[1-7])*$')
);

-- Planned maintenance and recorded breakdowns; the time is taken out of the calendar.
CREATE TABLE IF NOT EXISTS equipment_downtime (
    downtime_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL,
    downtime_type varchar(20) NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    reason varchar(500),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_equipment_downtime PRIMARY KEY (downtime_id),
    CONSTRAINT fk_equipment_downtime_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_equipment_downtime_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id),
    CONSTRAINT ck_equipment_downtime_type CHECK (downtime_type IN ('maintenance', 'breakdown', 'other')),
    CONSTRAINT ck_equipment_downtime_period CHECK (ends_at > starts_at),
    CONSTRAINT ck_equipment_downtime_deleted CHECK (deleted_yn IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_downtime_equipment ON equipment_downtime (equipment_id, starts_at)
    WHERE deleted_yn = 'N';

ALTER TABLE work_order ADD COLUMN IF NOT EXISTS equipment_id varchar(50);
ALTER TABLE work_order ADD CONSTRAINT fk_work_order_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_order_equipment_id ON work_order (equipment_id);
