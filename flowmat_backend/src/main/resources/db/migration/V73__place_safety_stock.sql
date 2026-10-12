-- V73: Safety stock for an item at one place of the location list (docs/domain/stock-alert.md PS1-PS6). A place's
-- reorder list compares it with the usable stock there and in the places inside it. The item-level safety stock stays on
-- item; a place watches only the items given a row here. Like other references to items, item_id has no foreign key.
CREATE TABLE place_safety_stock (
    place_safety_stock_id varchar(50) NOT NULL,
    project_id varchar(50) NOT NULL,
    item_id varchar(50) NOT NULL,
    location_id varchar(50) NOT NULL,
    safety_stock_qty numeric(14,4) NOT NULL,
    created_by varchar(50) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by varchar(50),
    updated_at timestamptz,
    CONSTRAINT pk_place_safety_stock PRIMARY KEY (place_safety_stock_id),
    CONSTRAINT fk_place_safety_stock_location FOREIGN KEY (location_id) REFERENCES storage_location (location_id),
    CONSTRAINT ck_place_safety_stock_qty CHECK (safety_stock_qty > 0),
    CONSTRAINT ux_place_safety_stock_item_location UNIQUE (item_id, location_id)
);
CREATE INDEX ix_place_safety_stock_project ON place_safety_stock (project_id);
