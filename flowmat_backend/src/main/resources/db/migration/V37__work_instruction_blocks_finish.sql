-- V37: A work instruction revision can keep runs from finishing until its required steps are confirmed
-- (docs/domain/work-instruction.md).
ALTER TABLE work_instruction ADD COLUMN IF NOT EXISTS blocks_finish_yn char(1) NOT NULL DEFAULT 'N';
ALTER TABLE work_instruction ADD CONSTRAINT ck_work_instruction_blocks_finish CHECK (blocks_finish_yn IN ('Y', 'N'));
