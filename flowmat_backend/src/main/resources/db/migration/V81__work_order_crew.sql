-- V81: The people a work order needs (docs/domain/worker-calendar.md WC11-WC16). Readiness and plan suggestions check that
-- they work in the planned window, from their calendars (V80).
CREATE TABLE work_order_crew (
    crew_id varchar(50) PRIMARY KEY,
    work_order_id varchar(50) NOT NULL REFERENCES work_order(work_order_id),
    user_id varchar(50) NOT NULL,
    added_by varchar(50) NOT NULL,
    added_at timestamptz NOT NULL,
    CONSTRAINT uq_work_order_crew UNIQUE (work_order_id, user_id)
);
