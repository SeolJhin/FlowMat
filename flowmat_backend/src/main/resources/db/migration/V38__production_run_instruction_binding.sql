-- R1: keep the first confirmed instruction revision even when the last confirmation is undone.
-- The checklist rows alone cannot retain the binding after every confirmation has been deleted.
ALTER TABLE production_run ADD COLUMN work_instruction_id varchar(50);
ALTER TABLE production_run ADD CONSTRAINT fk_production_run_work_instruction
    FOREIGN KEY (work_instruction_id) REFERENCES work_instruction (instruction_id);

-- Preserve the earliest surviving confirmation for existing runs. Runs without confirmations remain unbound.
UPDATE production_run run
SET work_instruction_id = first_check.instruction_id
FROM (
    SELECT DISTINCT ON (production_run_id) production_run_id, instruction_id
    FROM run_instruction_check
    ORDER BY production_run_id, checked_at, check_id
) first_check
WHERE run.production_run_id = first_check.production_run_id;
