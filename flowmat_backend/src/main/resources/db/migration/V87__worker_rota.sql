-- V87: Rotating rotas (docs/domain/worker-calendar.md WC44-WC50; user decision 2026-10-17 "Rotating worker rota"). A worker's
-- weekly shifts can repeat every 2 to 8 weeks: each shift runs in one week of the rota, and week 1 is the week that starts on
-- worker_rota.starts_on (a Monday). Without a row the shifts are one week, as before, all in week 1.
ALTER TABLE worker_shift
    ADD COLUMN rota_week integer NOT NULL DEFAULT 1,
    ADD CONSTRAINT ck_worker_shift_rota_week CHECK (rota_week BETWEEN 1 AND 8);

CREATE TABLE worker_rota (
    worker_rota_id varchar(50) PRIMARY KEY,
    project_id varchar(50) NOT NULL REFERENCES project(project_id),
    user_id varchar(50) NOT NULL,
    cycle_weeks integer NOT NULL CHECK (cycle_weeks BETWEEN 2 AND 8),
    starts_on date NOT NULL CHECK (extract(isodow FROM starts_on) = 1),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT uq_worker_rota_worker UNIQUE (project_id, user_id)
);
