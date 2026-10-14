-- V80: Workers' calendars (docs/domain/worker-calendar.md WC1-WC10; user decision 2026-10-13 "Worker calendar"). A worker is
-- someone who can read the project (its owner or an active member). Each has weekly shifts like equipment (V32, V43) and days
-- off; project holidays apply to everyone.
CREATE TABLE worker_shift (
    worker_shift_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    user_id varchar(50) NOT NULL,
    shift_start time NOT NULL,
    shift_end time NOT NULL,
    work_days varchar(20) NOT NULL CHECK (work_days ~ '^[1-7](,[1-7])*$'),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE INDEX ix_worker_shift_worker ON worker_shift(project_id, user_id);

CREATE TABLE worker_day_off (
    day_off_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    user_id varchar(50) NOT NULL,
    first_day date NOT NULL,
    last_day date NOT NULL,
    reason varchar(200),
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT ck_worker_day_off_range CHECK (last_day >= first_day AND last_day - first_day <= 366)
);
CREATE INDEX ix_worker_day_off_worker ON worker_day_off(project_id, user_id, first_day);
