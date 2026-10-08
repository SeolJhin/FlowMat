CREATE TABLE equipment_hourly_cost (
    equipment_id varchar(50) PRIMARY KEY REFERENCES equipment(equipment_id),
    hourly_cost numeric(14,4),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT ck_equipment_hourly_cost_nonnegative CHECK (hourly_cost IS NULL OR hourly_cost >= 0)
);
