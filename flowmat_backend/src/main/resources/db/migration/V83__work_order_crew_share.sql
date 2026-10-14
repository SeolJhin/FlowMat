-- V83: Each crew member's share of a work order (docs/domain/worker-calendar.md WC36-WC40): the part of their working time
-- in the planned window the order needs, 1 to 100 percent. Existing crew needed all of it.
ALTER TABLE work_order_crew
    ADD COLUMN share_percent integer NOT NULL DEFAULT 100,
    ADD CONSTRAINT ck_work_order_crew_share CHECK (share_percent BETWEEN 1 AND 100);
