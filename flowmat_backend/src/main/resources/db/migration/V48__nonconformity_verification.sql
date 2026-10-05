-- V48: Whether a closed nonconformity's actions worked (docs/domain/nonconformity.md N12). Checked once, only on a closed
-- nonconformity; all four columns are set together or not at all.
ALTER TABLE nonconformity ADD COLUMN verification_result varchar(20);
ALTER TABLE nonconformity ADD COLUMN verification_note varchar(1000);
ALTER TABLE nonconformity ADD COLUMN verified_by varchar(50);
ALTER TABLE nonconformity ADD COLUMN verified_at timestamptz;
ALTER TABLE nonconformity ADD CONSTRAINT ck_nonconformity_verification
    CHECK ((verification_result IS NULL AND verified_by IS NULL AND verified_at IS NULL)
        OR (verification_result IN ('effective', 'not_effective') AND verified_by IS NOT NULL AND verified_at IS NOT NULL
            AND status = 'closed'));
