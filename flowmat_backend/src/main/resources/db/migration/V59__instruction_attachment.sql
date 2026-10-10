CREATE TABLE instruction_attachment (
    attachment_id varchar(50) PRIMARY KEY,
    instruction_id varchar(50) NOT NULL REFERENCES work_instruction(instruction_id),
    storage_type varchar(10) NOT NULL CHECK (storage_type IN ('local','s3')),
    storage_key varchar(500) NOT NULL,
    file_name varchar(255) NOT NULL,
    content_type varchar(100) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    sha256 varchar(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    deleted_yn char(1) NOT NULL DEFAULT 'N' CHECK (deleted_yn IN ('N','Y')),
    created_by varchar(50), updated_by varchar(50),
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_instruction_attachment_revision ON instruction_attachment(instruction_id,created_at,attachment_id) WHERE deleted_yn='N';
