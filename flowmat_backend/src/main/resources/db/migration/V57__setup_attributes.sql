CREATE TABLE item_setup_attributes (
    item_id varchar(50) PRIMARY KEY REFERENCES item(item_id),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_by varchar(50) NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT ck_item_setup_attributes_object CHECK (jsonb_typeof(attributes) = 'object'),
    CONSTRAINT ck_item_setup_attributes_strings CHECK (NOT jsonb_path_exists(attributes, '$.* ? (@.type() != "string")'))
);
CREATE TABLE equipment_setup_changeover (
    changeover_id varchar(50) PRIMARY KEY,
    equipment_id varchar(50) NOT NULL REFERENCES equipment(equipment_id),
    from_attributes jsonb NOT NULL,
    to_attributes jsonb NOT NULL,
    priority integer NOT NULL CHECK (priority BETWEEN 1 AND 100000),
    minutes integer NOT NULL CHECK (minutes BETWEEN 1 AND 10080),
    version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
    note varchar(500),
    deleted_yn char(1) NOT NULL DEFAULT 'N' CHECK (deleted_yn IN ('N','Y')),
    created_by varchar(50),
    updated_by varchar(50),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_equipment_setup_changeover_objects CHECK (jsonb_typeof(from_attributes) = 'object' AND jsonb_typeof(to_attributes) = 'object'),
    CONSTRAINT ck_equipment_setup_changeover_strings CHECK (NOT jsonb_path_exists(from_attributes, '$.* ? (@.type() != "string")') AND NOT jsonb_path_exists(to_attributes, '$.* ? (@.type() != "string")')),
    CONSTRAINT ck_equipment_setup_changeover_predicate CHECK (from_attributes <> '{}'::jsonb OR to_attributes <> '{}'::jsonb)
);
CREATE UNIQUE INDEX uq_equipment_setup_changeover_priority ON equipment_setup_changeover(equipment_id, priority) WHERE deleted_yn = 'N';
