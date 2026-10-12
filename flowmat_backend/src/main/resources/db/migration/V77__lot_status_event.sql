-- V77: A LOT's close and reopen events (docs/domain/lot-release.md R9-R10). Closing an empty LOT, and reopening one, move no
-- ledger row, so they left no trace; each one is kept here from now on. Earlier ones are not reconstructed.
CREATE TABLE lot_status_event (
    lot_status_event_id varchar(50) PRIMARY KEY,
    lot_id varchar(50) NOT NULL REFERENCES lot_master(lot_id),
    project_id varchar(50) NOT NULL,
    action varchar(20) NOT NULL CHECK (action IN ('closed', 'reopened')),
    from_status varchar(20),
    to_status varchar(20) NOT NULL,
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX ix_lot_status_event_lot ON lot_status_event(lot_id, created_at);
