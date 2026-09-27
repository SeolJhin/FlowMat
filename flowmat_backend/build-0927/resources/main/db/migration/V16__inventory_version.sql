-- V16: optimistic locking for stock records.
-- Every write bumps the version, so a manual adjustment based on a stale read is rejected (HTTP 409)
-- instead of silently overwriting movements recorded in the meantime.
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
