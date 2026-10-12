-- V70: The day a closed nonconformity's actions are due to be checked (docs/domain/nonconformity.md N13). Set when it is
-- closed or later, until the check is recorded; only a closed nonconformity has one.
ALTER TABLE nonconformity ADD COLUMN verification_due_date date;
ALTER TABLE nonconformity ADD CONSTRAINT ck_nonconformity_verification_due
    CHECK (verification_due_date IS NULL OR status = 'closed');
