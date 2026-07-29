-- V3: Optimistic concurrency fields for Process and ProcessConnection.
-- version: monotonically incremented on each update.
-- version_nonce: random value on each update, used as tie-breaker when versions are equal.

ALTER TABLE "process"
    ADD COLUMN "version"       INT NOT NULL DEFAULT 1,
    ADD COLUMN "version_nonce" INT NOT NULL DEFAULT 0;

ALTER TABLE "process_connection"
    ADD COLUMN "version"       INT NOT NULL DEFAULT 1,
    ADD COLUMN "version_nonce" INT NOT NULL DEFAULT 0;

-- Randomize nonce for existing rows so concurrent-edit tie-breaking works correctly.
UPDATE "process"            SET version_nonce = (floor(random() * 2147483647))::int;
UPDATE "process_connection" SET version_nonce = (floor(random() * 2147483647))::int;
