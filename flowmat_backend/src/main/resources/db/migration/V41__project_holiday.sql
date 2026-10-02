-- V41: Project holidays (docs/domain/equipment-schedule.md "휴일"). Dates on which no calendar shift starts, for every
-- piece of equipment in the project that has a calendar. Equipment without a calendar stays available around the clock.

CREATE TABLE IF NOT EXISTS project_holiday (
    holiday_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    holiday_date date NOT NULL,
    holiday_name varchar(100),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_project_holiday PRIMARY KEY (holiday_id),
    CONSTRAINT fk_project_holiday_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT ck_project_holiday_deleted CHECK (deleted_yn IN ('Y', 'N'))
);

-- One live holiday per project and date.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_holiday_date
    ON project_holiday (project_id, holiday_date)
    WHERE deleted_yn = 'N';
