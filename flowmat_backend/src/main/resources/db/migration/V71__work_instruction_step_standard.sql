-- V71: The inspection standard a work instruction step takes its limits from (docs/domain/work-instruction.md W13-W15).
-- Only a step that records a value follows one. Like item_id, it names a standard of the quality context without a
-- foreign key; the step keeps its own copy of the limits, so a released revision does not change.
ALTER TABLE work_instruction_step ADD COLUMN standard_id varchar(50);
ALTER TABLE work_instruction_step ADD CONSTRAINT ck_work_instruction_step_standard
    CHECK (standard_id IS NULL OR records_value_yn = 'Y');
