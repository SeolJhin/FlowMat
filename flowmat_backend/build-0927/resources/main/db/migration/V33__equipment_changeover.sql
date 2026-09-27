-- V33: Changeover times on equipment (docs/domain/equipment-changeover.md, benchmark FM-PLAN-004 setup matrix). A rule
-- says how long the equipment takes to switch from making one item to another; either side may be any item. Work order
-- readiness adds it to the time an order needs when the previous order on the same equipment made something else.
CREATE TABLE IF NOT EXISTS equipment_changeover (
    changeover_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    equipment_id varchar(50) NOT NULL,
    from_item_id varchar(50),
    to_item_id varchar(50),
    changeover_minutes integer NOT NULL,
    note varchar(500),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    CONSTRAINT pk_equipment_changeover PRIMARY KEY (changeover_id),
    CONSTRAINT fk_equipment_changeover_project FOREIGN KEY (project_id) REFERENCES project (project_id),
    CONSTRAINT fk_equipment_changeover_equipment FOREIGN KEY (equipment_id) REFERENCES equipment (equipment_id),
    CONSTRAINT fk_equipment_changeover_from_item FOREIGN KEY (from_item_id) REFERENCES item (item_id),
    CONSTRAINT fk_equipment_changeover_to_item FOREIGN KEY (to_item_id) REFERENCES item (item_id),
    CONSTRAINT ck_equipment_changeover_minutes CHECK (changeover_minutes > 0 AND changeover_minutes <= 10080),
    CONSTRAINT ck_equipment_changeover_deleted CHECK (deleted_yn IN ('Y', 'N'))
);

-- One live rule per pair; an empty side means any item.
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_changeover_pair
    ON equipment_changeover (equipment_id, coalesce(from_item_id, ''), coalesce(to_item_id, '')) WHERE deleted_yn = 'N';
