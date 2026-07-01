-- Demo seed data for local frontend/backend verification.
-- Safe to run multiple times.

INSERT INTO "users" (
    "user_id",
    "user_name",
    "user_email",
    "user_pwd",
    "user_birth",
    "user_tel",
    "user_role",
    "user_status",
    "delete_yn"
)
VALUES (
    'demo-owner',
    'Demo Owner',
    'demo-owner@flowmat.local',
    '$2a$10$demo-placeholder-password-hash',
    DATE '1990-01-01',
    '010-0000-0000',
    'admin',
    'active',
    'N'
)
ON CONFLICT ("user_id") DO UPDATE
SET
    "user_name" = EXCLUDED."user_name",
    "user_email" = EXCLUDED."user_email",
    "user_tel" = EXCLUDED."user_tel",
    "user_role" = EXCLUDED."user_role",
    "user_status" = EXCLUDED."user_status",
    "delete_yn" = EXCLUDED."delete_yn",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "project" (
    "project_id",
    "project_name",
    "owner_id",
    "project_desc",
    "project_status",
    "project_type",
    "industry_type",
    "visibility",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES (
    'prj_demo_main',
    'Demo Manufacturing Project',
    'demo-owner',
    'Demo project for local FlowMat frontend/backend wiring.',
    'active',
    'production',
    'manufacturing',
    'private',
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("project_id") DO UPDATE
SET
    "project_name" = EXCLUDED."project_name",
    "owner_id" = EXCLUDED."owner_id",
    "project_desc" = EXCLUDED."project_desc",
    "project_status" = EXCLUDED."project_status",
    "project_type" = EXCLUDED."project_type",
    "industry_type" = EXCLUDED."industry_type",
    "visibility" = EXCLUDED."visibility",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";

INSERT INTO "workflow" (
    "workflow_id",
    "project_id",
    "workflow_name",
    "workflow_desc",
    "workflow_type",
    "workflow_status",
    "is_main_yn",
    "sort_order",
    "locked_yn",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES (
    'wf_demo_main',
    'prj_demo_main',
    'Demo Main Workflow',
    'Sample workflow for local canvas verification.',
    'main',
    'active',
    'Y',
    0,
    'N',
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("workflow_id") DO UPDATE
SET
    "project_id" = EXCLUDED."project_id",
    "workflow_name" = EXCLUDED."workflow_name",
    "workflow_desc" = EXCLUDED."workflow_desc",
    "workflow_type" = EXCLUDED."workflow_type",
    "workflow_status" = EXCLUDED."workflow_status",
    "is_main_yn" = EXCLUDED."is_main_yn",
    "locked_yn" = EXCLUDED."locked_yn",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";

UPDATE "project"
SET
    "current_workflow_id" = 'wf_demo_main',
    "updated_by" = 'demo-owner',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "project_id" = 'prj_demo_main';

INSERT INTO "process" (
    "process_id",
    "project_id",
    "workflow_id",
    "process_name",
    "process_type",
    "node_type",
    "process_status",
    "pos_x",
    "pos_y",
    "width",
    "height",
    "color_scheme",
    "process_desc",
    "created_by",
    "updated_by",
    "deleted_yn"
)
VALUES
(
    'prc_demo_input',
    'prj_demo_main',
    'wf_demo_main',
    'Raw Material Input',
    'input',
    'input',
    'active',
    120.0,
    180.0,
    180.0,
    88.0,
    'sky',
    'Starting node for demo canvas.',
    'demo-owner',
    'demo-owner',
    'N'
),
(
    'prc_demo_mix',
    'prj_demo_main',
    'wf_demo_main',
    'Mixing Process',
    'mixing',
    'process',
    'active',
    420.0,
    180.0,
    180.0,
    88.0,
    'amber',
    'Main processing node for demo canvas.',
    'demo-owner',
    'demo-owner',
    'N'
)
ON CONFLICT ("process_id") DO UPDATE
SET
    "project_id" = EXCLUDED."project_id",
    "workflow_id" = EXCLUDED."workflow_id",
    "process_name" = EXCLUDED."process_name",
    "process_type" = EXCLUDED."process_type",
    "node_type" = EXCLUDED."node_type",
    "process_status" = EXCLUDED."process_status",
    "pos_x" = EXCLUDED."pos_x",
    "pos_y" = EXCLUDED."pos_y",
    "width" = EXCLUDED."width",
    "height" = EXCLUDED."height",
    "color_scheme" = EXCLUDED."color_scheme",
    "process_desc" = EXCLUDED."process_desc",
    "updated_by" = EXCLUDED."updated_by",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_yn" = EXCLUDED."deleted_yn";
