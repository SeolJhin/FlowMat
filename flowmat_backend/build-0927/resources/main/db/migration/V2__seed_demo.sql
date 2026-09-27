-- V2: Demo seed data for local development.
-- Idempotent via ON CONFLICT DO UPDATE.

INSERT INTO "users" (
    "user_id", "user_name", "user_email", "user_pwd",
    "user_birth", "user_tel", "user_role", "user_status", "delete_yn"
) VALUES (
    'demo-owner', 'Demo Owner', 'demo-owner@flowmat.local',
    -- 임시 placeholder — DemoDataInitializer 가 시작 시 BCrypt 해시로 덮어씀
    'PLACEHOLDER_REPLACED_BY_INITIALIZER',
    '1990-01-01', '010-0000-0000', 'admin', 'active', 'N'
) ON CONFLICT ("user_id") DO UPDATE
SET user_name = EXCLUDED.user_name, user_status = EXCLUDED.user_status;

INSERT INTO "project" (
    "project_id", "project_name", "owner_id", "project_desc",
    "project_status", "project_type", "industry_type", "visibility",
    "created_by", "updated_by", "deleted_yn"
) VALUES (
    'prj_demo_main', 'Demo Manufacturing Project', 'demo-owner',
    'Demo project for local FlowMat frontend/backend wiring.',
    'active', 'production', 'manufacturing', 'private',
    'demo-owner', 'demo-owner', 'N'
) ON CONFLICT ("project_id") DO UPDATE
SET project_name = EXCLUDED.project_name, updated_by = EXCLUDED.updated_by;

INSERT INTO "workflow" (
    "workflow_id", "project_id", "workflow_name", "workflow_desc",
    "workflow_type", "workflow_status", "is_main_yn", "sort_order",
    "locked_yn", "created_by", "updated_by", "deleted_yn"
) VALUES (
    'wf_demo_main', 'prj_demo_main', 'Demo Main Workflow',
    'Sample workflow for local canvas verification.',
    'main', 'active', 'Y', 0, 'N', 'demo-owner', 'demo-owner', 'N'
) ON CONFLICT ("workflow_id") DO UPDATE
SET workflow_name = EXCLUDED.workflow_name;

UPDATE "project"
SET "current_workflow_id" = 'wf_demo_main', "updated_by" = 'demo-owner'
WHERE "project_id" = 'prj_demo_main';

INSERT INTO "process" (
    "process_id", "project_id", "workflow_id", "process_name",
    "process_type", "node_type", "process_status",
    "pos_x", "pos_y", "width", "height", "color_scheme",
    "process_desc", "created_by", "updated_by", "deleted_yn"
) VALUES
(
    'prc_demo_input', 'prj_demo_main', 'wf_demo_main',
    'Raw Material Input', 'input', 'input', 'active',
    120.0, 180.0, 180.0, 88.0, 'sky',
    'Starting node for demo canvas.', 'demo-owner', 'demo-owner', 'N'
),
(
    'prc_demo_mix', 'prj_demo_main', 'wf_demo_main',
    'Mixing Process', 'mixing', 'process', 'active',
    420.0, 180.0, 180.0, 88.0, 'amber',
    'Main processing node for demo canvas.', 'demo-owner', 'demo-owner', 'N'
)
ON CONFLICT ("process_id") DO UPDATE
SET process_name = EXCLUDED.process_name, pos_x = EXCLUDED.pos_x, pos_y = EXCLUDED.pos_y;

INSERT INTO "item" (
    "item_id", "project_id", "item_code", "item_name",
    "resource_category", "item_status", "unit",
    "created_by", "updated_by", "deleted_yn"
) VALUES (
    'itm_demo_mix_output', 'prj_demo_main', 'DEMO-MAT-001', 'Demo Material',
    'material', 'active', 'kg', 'demo-owner', 'demo-owner', 'N'
) ON CONFLICT ("item_id") DO UPDATE
SET item_name = EXCLUDED.item_name;

INSERT INTO "process_io" (
    "process_io_id", "process_id", "item_id", "io_name",
    "direction", "io_type", "quantity", "unit", "color_scheme",
    "required_yn", "allow_shortage_yn", "created_by", "updated_by", "deleted_yn"
) VALUES
(
    'pio_demo_input_out', 'prc_demo_input', 'itm_demo_mix_output',
    'Raw Material Output', 'output', 'material', 1.0000, 'kg', 'sky',
    'Y', 'N', 'demo-owner', 'demo-owner', 'N'
),
(
    'pio_demo_mix_in', 'prc_demo_mix', 'itm_demo_mix_output',
    'Raw Material Input', 'input', 'material', 1.0000, 'kg', 'amber',
    'Y', 'N', 'demo-owner', 'demo-owner', 'N'
)
ON CONFLICT ("process_io_id") DO UPDATE
SET io_name = EXCLUDED.io_name;

INSERT INTO "process_connection" (
    "connection_id", "project_id", "workflow_id",
    "from_process_id", "to_process_id", "from_io_id", "to_io_id", "item_id",
    "source_handle", "target_handle", "connection_type", "connection_label",
    "flow_rate", "unit", "delay_time_sec", "loss_rate", "priority",
    "created_by", "updated_by", "deleted_yn"
) VALUES (
    'pcn_demo_input_to_mix', 'prj_demo_main', 'wf_demo_main',
    'prc_demo_input', 'prc_demo_mix',
    'pio_demo_input_out', 'pio_demo_mix_in', 'itm_demo_mix_output',
    'pio_demo_input_out', 'pio_demo_mix_in',
    'material_flow', 'Material Flow',
    1.0000, 'kg', 0.0, 0.0, 0,
    'demo-owner', 'demo-owner', 'N'
) ON CONFLICT ("connection_id") DO UPDATE
SET connection_type = EXCLUDED.connection_type;
