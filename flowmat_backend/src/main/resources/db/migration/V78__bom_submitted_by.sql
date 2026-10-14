-- V78: Who submitted a BOM revision for approval and when (docs/domain/notification.md NT8). The owner's approval or
-- rejection tells that person. Revisions submitted before V78 have no submitter, so their decision tells no one.
ALTER TABLE bom_header ADD COLUMN IF NOT EXISTS submitted_by varchar(50);
ALTER TABLE bom_header ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
