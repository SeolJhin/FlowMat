-- V46: Undoing a run's work instruction confirmation keeps the row as history (docs/domain/work-instruction.md R6)
-- instead of deleting it. A step has at most one standing confirmation; undone ones may pile up beside it.
ALTER TABLE run_instruction_check ADD COLUMN undone_by varchar(50);
ALTER TABLE run_instruction_check ADD COLUMN undone_at timestamptz;
ALTER TABLE run_instruction_check ADD CONSTRAINT ck_run_instruction_check_undone CHECK ((undone_by IS NULL) = (undone_at IS NULL));
DROP INDEX IF EXISTS uq_run_instruction_check;
CREATE UNIQUE INDEX IF NOT EXISTS uq_run_instruction_check_live ON run_instruction_check (production_run_id, step_id) WHERE undone_at IS NULL;
