-- V13: production_run was missing deleted_yn even though ProductionRun.java
-- extends CreatedUpdatedAuditEntity (which requires it via SoftDeleteEntity).
-- Every read/write through the entity failed with "column deleted_yn does not exist".
-- All other soft-deletable tables in this schema use the same char(1) DEFAULT 'N' pattern.

ALTER TABLE "production_run"
    ADD COLUMN "deleted_yn" char(1) DEFAULT 'N';
