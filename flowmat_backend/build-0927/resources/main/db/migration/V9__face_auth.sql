CREATE TABLE IF NOT EXISTS face_descriptor (
    face_id bigserial PRIMARY KEY,
    user_id varchar(50) NOT NULL,
    descriptor text NOT NULL,
    fail_count integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_face_descriptor_user UNIQUE (user_id),
    CONSTRAINT fk_face_descriptor_user_id FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_face_descriptor_locked_until
    ON face_descriptor (locked_until);
