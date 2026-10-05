-- V51: Each status change of a piece of equipment (docs/domain/equipment.md "상태 이력"), with who, when and an optional
-- note, from this migration on. Creating equipment records its first status.
CREATE TABLE IF NOT EXISTS equipment_status_history (
    equipment_status_history_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL,
    previous_status varchar(20),
    equipment_status varchar(20) NOT NULL,
    note varchar(200),
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL,
    CONSTRAINT pk_equipment_status_history PRIMARY KEY (equipment_status_history_id),
    CONSTRAINT fk_equipment_status_history_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id),
    CONSTRAINT ck_equipment_status_history_status CHECK (equipment_status IN ('active', 'inactive', 'maintenance'))
);

CREATE INDEX IF NOT EXISTS ix_equipment_status_history_equipment ON equipment_status_history (equipment_id, changed_at);
