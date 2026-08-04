CREATE TABLE IF NOT EXISTS canvas_annotation (
    annotation_id varchar(64) PRIMARY KEY,
    workflow_id varchar(64) NOT NULL,
    project_id varchar(64) NOT NULL,
    annotation_type varchar(20) NOT NULL CHECK (annotation_type IN ('shape', 'freehand', 'text')),
    shape_kind varchar(20),
    pos_x double precision NOT NULL,
    pos_y double precision NOT NULL,
    width double precision,
    height double precision,
    rotation double precision NOT NULL DEFAULT 0,
    points_json jsonb,
    text_content text,
    image_asset_url text,
    style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    z_index varchar(64) NOT NULL,
    group_id varchar(64),
    locked_yn char(1) NOT NULL DEFAULT 'N',
    version integer NOT NULL DEFAULT 1,
    version_nonce bigint NOT NULL DEFAULT 1,
    deleted_yn char(1) NOT NULL DEFAULT 'N',
    created_by varchar(64),
    updated_by varchar(64),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_annotation_workflow
    ON canvas_annotation(workflow_id, z_index)
    WHERE deleted_yn = 'N';

CREATE INDEX IF NOT EXISTS idx_canvas_annotation_group
    ON canvas_annotation(group_id)
    WHERE group_id IS NOT NULL AND deleted_yn = 'N';
