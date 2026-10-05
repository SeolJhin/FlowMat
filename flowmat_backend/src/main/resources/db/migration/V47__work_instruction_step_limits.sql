-- V47: Limits for the value a work instruction step records (docs/domain/work-instruction.md R7). A value outside them
-- is still recorded and marked; limits only belong to steps that record a value.
ALTER TABLE work_instruction_step ADD COLUMN value_min numeric(18,4);
ALTER TABLE work_instruction_step ADD COLUMN value_max numeric(18,4);
ALTER TABLE work_instruction_step ADD CONSTRAINT ck_work_instruction_step_limits
    CHECK ((value_min IS NULL AND value_max IS NULL) OR records_value_yn = 'Y');
ALTER TABLE work_instruction_step ADD CONSTRAINT ck_work_instruction_step_limit_order
    CHECK (value_min IS NULL OR value_max IS NULL OR value_min <= value_max);
