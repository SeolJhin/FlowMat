-- V82: A worker's shifts for one date in place of their weekly shifts (docs/domain/worker-calendar.md WC29-WC35): overtime,
-- a short day or a day without work. One row per project, worker and date; `shifts` lists the shifts that start that day as
-- "06:00-14:00,14:00-18:00" (at most six); empty means the worker does not work that day.
CREATE TABLE worker_day_shift (
    day_shift_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    user_id varchar(50) NOT NULL,
    work_date date NOT NULL,
    shifts varchar(100) NOT NULL,
    reason varchar(200),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT uq_worker_day_shift UNIQUE (project_id, user_id, work_date),
    CONSTRAINT ck_worker_day_shift_shifts
        CHECK (shifts ~ '^([0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9](,[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]){0,5})?$')
);
