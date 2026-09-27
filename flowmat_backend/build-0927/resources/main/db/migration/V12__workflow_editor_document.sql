CREATE TABLE IF NOT EXISTS workflow_editor_document (
    workflow_id varchar(64) PRIMARY KEY,
    project_id varchar(64) NOT NULL,
    schema_version integer NOT NULL DEFAULT 1,
    camera_json jsonb NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
    next_element_seq integer NOT NULL DEFAULT 1,
    version integer NOT NULL DEFAULT 1,
    version_nonce bigint NOT NULL DEFAULT 1,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    created_by varchar(64),
    updated_by varchar(64),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_editor_element (
    editor_element_id varchar(64) PRIMARY KEY,
    workflow_id varchar(64) NOT NULL,
    project_id varchar(64) NOT NULL,
    element_id varchar(128) NOT NULL,
    element_type varchar(32) NOT NULL CHECK (
        element_type IN ('rectangle', 'ellipse', 'polygon', 'line', 'freehand', 'text', 'group')
    ),
    pos_x double precision NOT NULL,
    pos_y double precision NOT NULL,
    width double precision NOT NULL,
    height double precision NOT NULL,
    rotation double precision NOT NULL DEFAULT 0,
    opacity double precision NOT NULL DEFAULT 1,
    parent_element_id varchar(128),
    element_order integer NOT NULL,
    geometry_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    locked_yn char(1) NOT NULL DEFAULT 'N',
    hidden_yn char(1) NOT NULL DEFAULT 'N',
    version integer NOT NULL DEFAULT 1,
    version_nonce bigint NOT NULL DEFAULT 1,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    created_by varchar(64),
    updated_by varchar(64),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflow_editor_element_workflow
    ON workflow_editor_element(workflow_id, element_order, created_at)
    WHERE deleted_yn = 'N';

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_editor_element_active_id
    ON workflow_editor_element(workflow_id, element_id)
    WHERE deleted_yn = 'N';
