ALTER TABLE process_io
    ADD COLUMN role varchar(50),
    ADD COLUMN resource_type varchar(50),
    ADD COLUMN schema_json jsonb,
    ADD COLUMN validation_rule text;

UPDATE process_io SET resource_type = COALESCE(io_type, 'material');

ALTER TABLE process_io
    ALTER COLUMN resource_type SET DEFAULT 'material',
    ALTER COLUMN resource_type SET NOT NULL,
    ADD CONSTRAINT ck_process_io_schema_json_object
        CHECK (schema_json IS NULL OR jsonb_typeof(schema_json) = 'object');
