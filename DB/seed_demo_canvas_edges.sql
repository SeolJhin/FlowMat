-- Additional demo seed data for visible edges on the workflow canvas.
-- Run this after seed_demo_workspace.sql.

INSERT INTO "item" (
    "item_id",
    "project_id",
    "item_code",
    "item_name",
    "resource_category",
    "item_status",
    "unit",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES (
    'itm_demo_mix_output',
    'prj_demo_main',
    'DEMO-MAT-001',
    'Demo Material',
    'material',
    'active',
    'kg',
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("item_id") DO UPDATE
SET
    "project_id" = EXCLUDED."project_id",
    "item_code" = EXCLUDED."item_code",
    "item_name" = EXCLUDED."item_name",
    "resource_category" = EXCLUDED."resource_category",
    "item_status" = EXCLUDED."item_status",
    "unit" = EXCLUDED."unit",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";

INSERT INTO "process_io" (
    "process_io_id",
    "process_id",
    "item_id",
    "io_name",
    "direction",
    "io_type",
    "quantity",
    "unit",
    "color_scheme",
    "required_yn",
    "allow_shortage_yn",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES
(
    'pio_demo_input_out',
    'prc_demo_input',
    'itm_demo_mix_output',
    'Raw Material Output',
    'output',
    'material',
    1.0000,
    'kg',
    'sky',
    'Y',
    'N',
    'demo-owner',
    'demo-owner',
    'N'
),
(
    'pio_demo_mix_in',
    'prc_demo_mix',
    'itm_demo_mix_output',
    'Raw Material Input',
    'input',
    'material',
    1.0000,
    'kg',
    'amber',
    'Y',
    'N',
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("process_io_id") DO UPDATE
SET
    "process_id" = EXCLUDED."process_id",
    "item_id" = EXCLUDED."item_id",
    "io_name" = EXCLUDED."io_name",
    "direction" = EXCLUDED."direction",
    "io_type" = EXCLUDED."io_type",
    "quantity" = EXCLUDED."quantity",
    "unit" = EXCLUDED."unit",
    "color_scheme" = EXCLUDED."color_scheme",
    "required_yn" = EXCLUDED."required_yn",
    "allow_shortage_yn" = EXCLUDED."allow_shortage_yn",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";

INSERT INTO "process_connection" (
    "connection_id",
    "project_id",
    "workflow_id",
    "from_process_id",
    "to_process_id",
    "from_io_id",
    "to_io_id",
    "item_id",
    "source_handle",
    "target_handle",
    "connection_type",
    "connection_label",
    "flow_rate",
    "unit",
    "delay_time_sec",
    "loss_rate",
    "priority",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES (
    'pcn_demo_input_to_mix',
    'prj_demo_main',
    'wf_demo_main',
    'prc_demo_input',
    'prc_demo_mix',
    'pio_demo_input_out',
    'pio_demo_mix_in',
    'itm_demo_mix_output',
    'pio_demo_input_out',
    'pio_demo_mix_in',
    'material',
    'Material Flow',
    1.0000,
    'kg',
    0.0,
    0.0,
    0,
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("connection_id") DO UPDATE
SET
    "project_id" = EXCLUDED."project_id",
    "workflow_id" = EXCLUDED."workflow_id",
    "from_process_id" = EXCLUDED."from_process_id",
    "to_process_id" = EXCLUDED."to_process_id",
    "from_io_id" = EXCLUDED."from_io_id",
    "to_io_id" = EXCLUDED."to_io_id",
    "item_id" = EXCLUDED."item_id",
    "source_handle" = EXCLUDED."source_handle",
    "target_handle" = EXCLUDED."target_handle",
    "connection_type" = EXCLUDED."connection_type",
    "connection_label" = EXCLUDED."connection_label",
    "flow_rate" = EXCLUDED."flow_rate",
    "unit" = EXCLUDED."unit",
    "delay_time_sec" = EXCLUDED."delay_time_sec",
    "loss_rate" = EXCLUDED."loss_rate",
    "priority" = EXCLUDED."priority",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";
