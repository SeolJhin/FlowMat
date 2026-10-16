-- V85: An Exclusive gateway's default connection (docs/architecture/adr/ADR-006-operation-types.md decision 3): taken when
-- none of the gateway's other connections has a condition that holds. Validation keeps it to at most one per gateway and
-- refuses it on any other connection. The gateway itself is process.node_type 'exclusive' (no schema change).
ALTER TABLE process_connection
    ADD COLUMN default_route_yn char(1) NOT NULL DEFAULT 'N',
    ADD CONSTRAINT ck_process_connection_default_route CHECK (default_route_yn IN ('Y', 'N'));
