-- V72: The quality inspection a run's confirmation of a step that follows an inspection standard also recorded
-- (docs/domain/work-instruction.md R9). Inspections are never changed, so the result is kept beside the id; like
-- standard_id, the id names a row of the quality context without a foreign key.
ALTER TABLE run_instruction_check ADD COLUMN inspection_id varchar(50);
ALTER TABLE run_instruction_check ADD COLUMN inspection_result varchar(10);
ALTER TABLE run_instruction_check ADD CONSTRAINT ck_run_instruction_check_inspection
    CHECK ((inspection_id IS NULL AND inspection_result IS NULL)
        OR (inspection_id IS NOT NULL AND inspection_result IN ('pass', 'fail')));
