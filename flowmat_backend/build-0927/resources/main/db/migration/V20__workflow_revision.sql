CREATE TABLE workflow_revision (
    workflow_revision_id varchar(50) PRIMARY KEY,
    workflow_id varchar(50) NOT NULL REFERENCES workflow(workflow_id),
    revision_no integer NOT NULL CHECK (revision_no > 0),
    status varchar(20) NOT NULL CHECK (status IN ('published', 'retired')),
    schema_version integer NOT NULL CHECK (schema_version > 0),
    snapshot_json jsonb NOT NULL,
    published_by varchar(50) NOT NULL,
    published_at timestamptz NOT NULL,
    retired_by varchar(50),
    retired_at timestamptz,
    CONSTRAINT uq_workflow_revision_no UNIQUE (workflow_id, revision_no),
    CONSTRAINT ck_workflow_revision_retired CHECK (
        (status = 'published' AND retired_by IS NULL AND retired_at IS NULL)
        OR (status = 'retired' AND retired_by IS NOT NULL AND retired_at IS NOT NULL)
    )
);

CREATE INDEX idx_workflow_revision_recent ON workflow_revision (workflow_id, revision_no DESC);
