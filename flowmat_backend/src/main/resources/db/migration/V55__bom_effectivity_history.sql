ALTER TABLE bom_header ADD COLUMN effective_period_version bigint NOT NULL DEFAULT 0 CHECK (effective_period_version >= 0);
CREATE TABLE bom_effectivity_change (
    change_id varchar(50) PRIMARY KEY,
    bom_id varchar(50) NOT NULL REFERENCES bom_header(bom_id),
    request_id uuid NOT NULL,
    previous_effective_from date,
    previous_effective_to date,
    effective_from date,
    effective_to date,
    period_version bigint NOT NULL CHECK (period_version > 0),
    reason varchar(1000) NOT NULL,
    changed_by varchar(50) NOT NULL,
    changed_at timestamptz NOT NULL,
    CONSTRAINT uq_bom_effectivity_request UNIQUE (bom_id, request_id),
    CONSTRAINT uq_bom_effectivity_version UNIQUE (bom_id, period_version),
    CONSTRAINT ck_bom_effectivity_range CHECK (effective_from IS NULL OR effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_bom_effectivity_history ON bom_effectivity_change (bom_id, period_version DESC);
