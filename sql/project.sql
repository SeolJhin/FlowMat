-- Auto-generated PostgreSQL DDL from WBS_FlowMat (1).xlsx
-- Source sheets: 유저T 기술서 2, 프로젝트 테이블 기술서, 시트9
-- Notes:
-- 1) Excel의 FK 체크(✔️)는 참조 대상 테이블 정보가 부족해 FK 제약 대신 인덱스로 변환했습니다.
-- 2) datetime/timestamp는 PostgreSQL 기준 timestamptz로 변환했습니다.
-- 3) UUID 기본값 gen_random_uuid() 사용을 위해 pgcrypto 확장을 활성화합니다.
-- 4) 명백한 오탈자 일부는 SQL 사용성을 위해 정리했습니다: plain_id→plan_id, subcription_id→subscription_id, primotion_id→promotion_id, panding→pending.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(50) NOT NULL UNIQUE,
    "user_name" varchar(50) NOT NULL,
    "user_email" varchar(100) NOT NULL UNIQUE,
    "user_pwd" varchar(255) NOT NULL,
    "user_birth" date NOT NULL,
    "user_tel" varchar(20) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "user_role" varchar(20) DEFAULT 'user' NOT NULL,
    "lastlogin_at" timestamptz,
    "pwd_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "user_status" varchar(20) DEFAULT 'active' NOT NULL,
    "delete_yn" char(1) DEFAULT 'N' NOT NULL,
    "avatar_url" varchar(255),
    "dormant_at" timestamptz,
    "dormant_token" varchar(255),
    "withdrawn_at" timestamptz,
    "email_verified_yn" char(1),
    "email_verified_at" timestamptz,
    "failed_login_count" integer DEFAULT 3,
    "locked_at" timestamptz,
    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
    "role_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "role_name" varchar(100) NOT NULL UNIQUE,
    "role_description" varchar(100),
    "role_is_system" char(1) DEFAULT 'N' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_roles" PRIMARY KEY ("role_id")
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_permissions_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "role_id" uuid NOT NULL,
    "resource" varchar(100) NOT NULL,
    "action" varchar(50) NOT NULL,
    "permission_code" varchar(100),
    CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_permissions_id")
);

CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_roles_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "role_id" uuid NOT NULL,
    "scope_type" varchar(20) DEFAULT 'global' NOT NULL,
    "scope_id" uuid,
    "granted_by" uuid,
    "granted_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_user_roles" PRIMARY KEY ("user_roles_id")
);

CREATE TABLE IF NOT EXISTS "user_login_history" (
    "login_history_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "login_ip" varchar(45) NOT NULL,
    "user_agent" text,
    "login_result" varchar(20) DEFAULT 'success' NOT NULL,
    "fail_reason" varchar(255),
    "login_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "logout_at" timestamptz,
    "refresh_token_id" uuid,
    CONSTRAINT "pk_user_login_history" PRIMARY KEY ("login_history_id")
);

CREATE TABLE IF NOT EXISTS "notification" (
    "nfc_id" varchar(50) NOT NULL,
    "user_id" varchar(50) NOT NULL,
    "nfc_type" varchar(50) NOT NULL,
    "nfc_title" varchar(200) NOT NULL,
    "nfc_body" text,
    "ref_type" varchar(50),
    "ref_id" varchar(50),
    "is_read" boolean DEFAULT 0 NOT NULL,
    "read_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_notification" PRIMARY KEY ("nfc_id")
);

CREATE TABLE IF NOT EXISTS "resource_types" (
    "rs_type_id" varchar(50) NOT NULL,
    "rs_code" varchar(50) NOT NULL,
    "rs_name" varchar(50) NOT NULL,
    "rs_unit" varchar(50) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_resource_types" PRIMARY KEY ("rs_type_id")
);

CREATE TABLE IF NOT EXISTS "resources" (
    "rs_id" varchar(50) NOT NULL,
    "machine_id" varchar(50) NOT NULL,
    "rs_type_id" varchar(50) NOT NULL,
    "meter_no" varchar(50),
    "installed_at" timestamptz,
    "is_active" boolean,
    CONSTRAINT "pk_resources" PRIMARY KEY ("rs_id")
);

CREATE TABLE IF NOT EXISTS "resource_usage" (
    "rs_usage_id" varchar(50) NOT NULL,
    "rs_id" varchar(50) NOT NULL,
    "measured_at" timestamptz NOT NULL,
    "usage_amount" varchar(50) NOT NULL,
    "source_type" varchar(50) NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_resource_usage" PRIMARY KEY ("rs_usage_id")
);

CREATE TABLE IF NOT EXISTS "project" (
    "project_id" varchar(50) NOT NULL,
    "project_name" varchar(100) NOT NULL,
    "owner_id" varchar(50) NOT NULL,
    "project_desc" text,
    "project_status" varchar(20) DEFAULT 'active' NOT NULL,
    "project_type" varchar(30) DEFAULT 'production',
    "industry_type" varchar(50),
    "visibility" varchar(20) DEFAULT 'private' NOT NULL,
    "thumbnail_url" varchar(255),
    "canvas_zoom" numeric(6,2) DEFAULT 100.0,
    "canvas_offset_x" numeric(10,2) DEFAULT 0.0,
    "canvas_offset_y" numeric(10,2) DEFAULT 0.0,
    "canvas_width" numeric(10,2) DEFAULT 5000.0,
    "canvas_height" numeric(10,2) DEFAULT 3000.0,
    "grid_size" numeric(8,2) DEFAULT 20.0,
    "snap_enabled" char(1) DEFAULT 'Y',
    "project_version" integer DEFAULT 1,
    "current_workflow_id" varchar(50),
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "last_saved_at" timestamptz,
    "archived_at" timestamptz,
    "deleted_yn" char(1) DEFAULT 'N',
    "deleted_at" timestamptz,
    CONSTRAINT "pk_project" PRIMARY KEY ("project_id")
);

CREATE TABLE IF NOT EXISTS "project_member" (
    "project_member_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "user_id" varchar(50) NOT NULL,
    "project_role" varchar(20) DEFAULT 'viewer' NOT NULL,
    "member_status" varchar(20) DEFAULT 'active' NOT NULL,
    "invited_by" varchar(50),
    "joined_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_project_member" PRIMARY KEY ("project_member_id")
);

CREATE TABLE IF NOT EXISTS "project_permission" (
    "project_permission_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "project_role" varchar(20) NOT NULL,
    "resource_type" varchar(50) NOT NULL,
    "action_type" varchar(50) NOT NULL,
    "allow_yn" char(1) DEFAULT 'Y' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_project_permission" PRIMARY KEY ("project_permission_id")
);

CREATE TABLE IF NOT EXISTS "project_invite" (
    "invite_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "invited_email" varchar(100) NOT NULL,
    "invited_user_id" varchar(50),
    "project_role" varchar(20) DEFAULT 'viewer' NOT NULL,
    "invite_status" varchar(20) DEFAULT 'pending' NOT NULL,
    "invite_token" varchar(255) NOT NULL,
    "invited_by" varchar(50) NOT NULL,
    "accepted_at" timestamptz,
    "expired_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_project_invite" PRIMARY KEY ("invite_id")
);

CREATE TABLE IF NOT EXISTS "workflow" (
    "workflow_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_name" varchar(100) NOT NULL,
    "workflow_desc" text,
    "workflow_type" varchar(30) DEFAULT 'main',
    "workflow_status" varchar(20) DEFAULT 'active' NOT NULL,
    "is_main_yn" char(1) DEFAULT 'N',
    "location" varchar(100),
    "capacity_per_hour" numeric(14,4),
    "operating_hours_per_day" numeric(5,2),
    "workflow_version" integer DEFAULT 1,
    "canvas_snapshot" jsonb DEFAULT '{}'::jsonb,
    "simulation_config" jsonb DEFAULT '{}'::jsonb,
    "locked_yn" char(1) DEFAULT 'N',
    "locked_by" varchar(50),
    "locked_at" timestamptz,
    "sort_order" integer DEFAULT 0,
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_workflow" PRIMARY KEY ("workflow_id")
);

CREATE TABLE IF NOT EXISTS "process_template" (
    "template_id" varchar(50) NOT NULL,
    "template_name" varchar(100) NOT NULL,
    "template_category" varchar(50) NOT NULL,
    "template_type" varchar(30) DEFAULT 'process' NOT NULL,
    "icon_key" varchar(50),
    "default_width" numeric(8,2) DEFAULT 120.0,
    "default_height" numeric(8,2) DEFAULT 60.0,
    "default_duration_min" integer,
    "default_worker_count" integer DEFAULT 0,
    "default_temperature_c" numeric(7,2),
    "default_pressure_kpa" numeric(10,3),
    "default_energy_kwh" numeric(10,4),
    "default_water_liter" numeric(14,4),
    "default_desc" text,
    "default_config" jsonb DEFAULT '{}'::jsonb,
    "public_yn" char(1) DEFAULT 'Y',
    "sort_order" integer DEFAULT 0,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_process_template" PRIMARY KEY ("template_id")
);

CREATE TABLE IF NOT EXISTS "workflow_template" (
    "template_id" varchar(50) NOT NULL,
    "template_name" varchar(100) NOT NULL,
    "template_category" varchar(50) NOT NULL,
    "template_type" varchar(30) DEFAULT 'process' NOT NULL,
    "icon_key" varchar(50),
    "default_width" numeric(8,2) DEFAULT 120.0,
    "default_height" numeric(8,2) DEFAULT 60.0,
    "default_duration_min" integer,
    "default_worker_count" integer DEFAULT 0,
    "default_temperature_c" numeric(7,2),
    "default_pressure_kpa" numeric(10,3),
    "default_energy_kwh" numeric(10,4),
    "default_water_liter" numeric(14,4),
    "default_desc" text,
    "default_config" jsonb DEFAULT '{}'::jsonb,
    "public_yn" char(1) DEFAULT 'Y',
    "sort_order" integer DEFAULT 0,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_workflow_template" PRIMARY KEY ("template_id")
);

CREATE TABLE IF NOT EXISTS "process" (
    "process_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50) NOT NULL,
    "template_id" varchar(50),
    "process_code" varchar(50),
    "process_name" varchar(100) NOT NULL,
    "process_type" varchar(50) NOT NULL,
    "node_type" varchar(30) DEFAULT 'process',
    "parent_process_id" varchar(50),
    "equipment_id" varchar(50),
    "process_status" varchar(20) DEFAULT 'active',
    "lane" varchar(50),
    "pos_x" numeric(10,2) DEFAULT 0.0,
    "pos_y" numeric(10,2) DEFAULT 0.0,
    "width" numeric(8,2) DEFAULT 120.0,
    "height" numeric(8,2) DEFAULT 60.0,
    "rotation" numeric(6,2) DEFAULT 0.0,
    "z_index" integer DEFAULT 0,
    "locked_yn" char(1) DEFAULT 'N',
    "process_desc" text,
    "worker_count" integer DEFAULT 0,
    "duration_min" integer,
    "cycle_time_sec" numeric(10,2),
    "setup_time_min" integer DEFAULT 0,
    "wait_time_min" integer DEFAULT 0,
    "batch_size" numeric(14,4),
    "batch_unit" varchar(20),
    "capacity_per_hour" numeric(14,4),
    "min_capacity" numeric(14,4),
    "max_capacity" numeric(14,4),
    "temperature_c" numeric(7,2),
    "pressure_kpa" numeric(10,3),
    "humidity_pct" numeric(5,2),
    "energy_kwh" numeric(10,4),
    "water_liter" numeric(14,4),
    "cost_per_run" numeric(14,4),
    "yield_rate" numeric(5,4) DEFAULT 1.0,
    "availability_rate" numeric(5,4) DEFAULT 1.0,
    "changeover_time_min" integer DEFAULT 0,
    "changeover_cost" numeric(14,4) DEFAULT 0.0,
    "input_policy" varchar(30) DEFAULT 'manual',
    "output_policy" varchar(30) DEFAULT 'calculated',
    "quality_check_yn" char(1) DEFAULT 'N',
    "inspection_standard" text,
    "icon_key" varchar(50),
    "color_scheme" varchar(30),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "sort_order" integer DEFAULT 0,
    "active_yn" char(1) DEFAULT 'Y',
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_process" PRIMARY KEY ("process_id")
);

CREATE TABLE IF NOT EXISTS "process_io" (
    "process_io_id" varchar(50) NOT NULL,
    "process_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "io_name" varchar(100),
    "direction" varchar(10) NOT NULL,
    "io_type" varchar(30) DEFAULT 'material',
    "port_key" varchar(50),
    "source_type" varchar(30) DEFAULT 'inventory',
    "target_type" varchar(30) DEFAULT 'next_process',
    "quantity" numeric(14,4) NOT NULL,
    "unit" varchar(20) NOT NULL,
    "quantity_basis" varchar(20) DEFAULT 'per_run',
    "formula" text,
    "min_quantity" numeric(14,4),
    "max_quantity" numeric(14,4),
    "loss_rate" numeric(5,4) DEFAULT 0.0,
    "required_yn" char(1) DEFAULT 'Y',
    "allow_shortage_yn" char(1) DEFAULT 'N',
    "consume_timing" varchar(30) DEFAULT 'start',
    "produce_timing" varchar(30) DEFAULT 'end',
    "sort_order" integer DEFAULT 0,
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "batch_size" numeric(14,4),
    "batch_unit" varchar(20),
    "capacity_per_hour" numeric(14,4),
    "min_capacity" numeric(14,4),
    "max_capacity" numeric(14,4),
    "temperature_c" numeric(7,2),
    "pressure_kpa" numeric(10,3),
    "humidity_pct" numeric(5,2),
    "energy_kwh" numeric(10,4),
    "water_liter" numeric(14,4),
    "cost_per_run" numeric(14,4),
    "yield_rate" numeric(5,4) DEFAULT 1.0,
    "availability_rate" numeric(5,4) DEFAULT 1.0,
    "changeover_time_min" integer DEFAULT 0,
    "changeover_cost" numeric(14,4) DEFAULT 0.0,
    "input_policy" varchar(30) DEFAULT 'manual',
    "output_policy" varchar(30) DEFAULT 'calculated',
    "quality_check_yn" char(1) DEFAULT 'N',
    "inspection_standard" text,
    "icon_key" varchar(50),
    "color_scheme" varchar(30),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "active_yn" char(1) DEFAULT 'Y',
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_process_io" PRIMARY KEY ("process_io_id")
);

CREATE TABLE IF NOT EXISTS "process_connection" (
    "connection_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50) NOT NULL,
    "from_process_id" varchar(50) NOT NULL,
    "to_process_id" varchar(50) NOT NULL,
    "from_io_id" varchar(50),
    "to_io_id" varchar(50),
    "item_id" varchar(50),
    "source_handle" varchar(50),
    "target_handle" varchar(50),
    "line_type" varchar(30) DEFAULT 'main',
    "connection_type" varchar(30) DEFAULT 'material',
    "flow_direction" varchar(20) DEFAULT 'forward',
    "connection_label" varchar(100),
    "flow_rate" numeric(14,4),
    "min_flow_rate" numeric(14,4),
    "max_flow_rate" numeric(14,4),
    "unit" varchar(20),
    "delay_time_sec" numeric(10,2) DEFAULT 0.0,
    "distance_meter" numeric(10,2),
    "loss_rate" numeric(5,4) DEFAULT 0.0,
    "priority" integer DEFAULT 0,
    "waypoints" jsonb DEFAULT '[]'::jsonb,
    "style" jsonb DEFAULT '{}'::jsonb,
    "flow_condition" jsonb DEFAULT '{}'::jsonb,
    "animated_yn" char(1) DEFAULT 'N',
    "active_yn" char(1) DEFAULT 'Y',
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_process_connection" PRIMARY KEY ("connection_id")
);

CREATE TABLE IF NOT EXISTS "item" (
    "item_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "item_code" varchar(50) NOT NULL,
    "item_name" varchar(100) NOT NULL,
    "item_type" varchar(50),
    "item_category" varchar(50),
    "resource_category" varchar(30) DEFAULT 'material' NOT NULL,
    "resource_type" varchar(50),
    "domain_resource_type_id" varchar(50),
    "item_group" varchar(50),
    "item_status" varchar(20) DEFAULT 'active',
    "unit" varchar(20),
    "unit_id" varchar(50),
    "purchase_unit" varchar(20),
    "production_unit" varchar(20),
    "conversion_rate" numeric(18,8) DEFAULT 1.0,
    "unit_cost" numeric(14,4) DEFAULT 0.0,
    "cost_calc_type" varchar(30) DEFAULT 'per_quantity',
    "spec" varchar(200),
    "spec_json" jsonb DEFAULT '{}'::jsonb,
    "barcode" varchar(100),
    "sku" varchar(100),
    "item_desc" text,
    "stock_managed_yn" char(1) DEFAULT 'Y',
    "metered_yn" char(1) DEFAULT 'N',
    "consumable_yn" char(1) DEFAULT 'Y',
    "reusable_yn" char(1) DEFAULT 'N',
    "physical_yn" char(1) DEFAULT 'Y',
    "digital_yn" char(1) DEFAULT 'N',
    "stateful_yn" char(1) DEFAULT 'Y',
    "safety_stock_qty" numeric(14,4) DEFAULT 0.0,
    "lead_time_days" integer,
    "storage_condition" varchar(100),
    "expiry_manage_yn" char(1) DEFAULT 'N',
    "lot_manage_yn" char(1) DEFAULT 'N',
    "serial_manage_yn" char(1) DEFAULT 'N',
    "allergen_info" jsonb DEFAULT '{}'::jsonb,
    "hazard_info" jsonb DEFAULT '{}'::jsonb,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "active_yn" char(1) DEFAULT 'Y',
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_item" PRIMARY KEY ("item_id")
);

CREATE TABLE IF NOT EXISTS "unit_master" (
    "unit_id" varchar(50) NOT NULL,
    "unit_code" varchar(20) NOT NULL,
    "unit_name" varchar(50) NOT NULL,
    "unit_type" varchar(30) NOT NULL,
    "base_unit_code" varchar(20),
    "conversion_rate" numeric(18,8) DEFAULT 1.0,
    "active_yn" char(1) DEFAULT 'Y',
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_unit_master" PRIMARY KEY ("unit_id")
);

CREATE TABLE IF NOT EXISTS "inventory" (
    "inventory_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "lot_id" varchar(50),
    "quantity" numeric(14,4) DEFAULT 0.0 NOT NULL,
    "reserved_quantity" numeric(14,4) DEFAULT 0.0,
    "available_quantity" numeric(14,4) DEFAULT 0.0,
    "inbound_expected_qty" numeric(14,4) DEFAULT 0.0,
    "outbound_expected_qty" numeric(14,4) DEFAULT 0.0,
    "min_threshold" numeric(14,4) DEFAULT 0.0,
    "max_threshold" numeric(14,4),
    "inventory_status" varchar(20) DEFAULT 'available',
    "location" varchar(100),
    "warehouse_code" varchar(50),
    "zone" varchar(50),
    "lot_no" varchar(100),
    "expiry_date" date,
    "locked_yn" char(1) DEFAULT 'N',
    "last_checked_at" timestamptz,
    "last_checked_by" varchar(50),
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_inventory" PRIMARY KEY ("inventory_id")
);

CREATE TABLE IF NOT EXISTS "inventory_transaction" (
    "inventory_transaction_id" varchar(50) NOT NULL,
    "inventory_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "lot_id" varchar(50),
    "transaction_type" varchar(30) NOT NULL,
    "quantity_delta" numeric(14,4) NOT NULL,
    "reserved_delta" numeric(14,4) DEFAULT 0.0,
    "available_delta" numeric(14,4) DEFAULT 0.0,
    "quantity_after" numeric(14,4),
    "reserved_after" numeric(14,4),
    "available_after" numeric(14,4),
    "reference_type" varchar(30),
    "reference_id" varchar(50),
    "note" text,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_inventory_transaction" PRIMARY KEY ("inventory_transaction_id")
);

CREATE TABLE IF NOT EXISTS "bom_header" (
    "bom_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "target_item_id" varchar(50) NOT NULL,
    "bom_name" varchar(100) NOT NULL,
    "bom_version" integer DEFAULT 1 NOT NULL,
    "base_quantity" numeric(14,4) DEFAULT 1.0 NOT NULL,
    "base_unit" varchar(20) DEFAULT 'ea' NOT NULL,
    "output_quantity" numeric(14,4) DEFAULT 1.0,
    "bom_status" varchar(20) DEFAULT 'draft',
    "approval_status" varchar(20) DEFAULT 'draft',
    "approved_by" varchar(50),
    "approved_at" timestamptz,
    "active_yn" char(1) DEFAULT 'Y',
    "effective_from" date,
    "effective_to" date,
    "note" text,
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_bom_header" PRIMARY KEY ("bom_id")
);

CREATE TABLE IF NOT EXISTS "bom_line" (
    "bom_line_id" varchar(50) NOT NULL,
    "bom_id" varchar(50) NOT NULL,
    "child_item_id" varchar(50) NOT NULL,
    "line_type" varchar(20) DEFAULT 'material',
    "quantity" numeric(14,4) NOT NULL,
    "unit" varchar(20) NOT NULL,
    "scrap_rate" numeric(5,4) DEFAULT 0.0,
    "optional_yn" char(1) DEFAULT 'N',
    "substitute_group" varchar(50),
    "priority" integer DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "note" text,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_bom_line" PRIMARY KEY ("bom_line_id")
);

CREATE TABLE IF NOT EXISTS "equipment" (
    "equipment_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "equipment_code" varchar(50),
    "equipment_name" varchar(100) NOT NULL,
    "equipment_type" varchar(50) NOT NULL,
    "manufacturer" varchar(100),
    "model_name" varchar(100),
    "serial_no" varchar(100),
    "capacity_per_hour" numeric(14,4),
    "power_kwh" numeric(10,4),
    "water_liter" numeric(14,4),
    "equipment_status" varchar(20) DEFAULT 'active',
    "location" varchar(100),
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_equipment" PRIMARY KEY ("equipment_id")
);

CREATE TABLE IF NOT EXISTS "work_order" (
    "work_order_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50),
    "bom_id" varchar(50),
    "work_order_number" varchar(50) NOT NULL UNIQUE,
    "work_order_title" varchar(100) NOT NULL,
    "work_order_status" varchar(20) DEFAULT 'draft',
    "priority" varchar(20) DEFAULT 'normal',
    "target_item_id" varchar(50),
    "target_quantity" numeric(14,4),
    "planned_start_at" timestamptz,
    "planned_end_at" timestamptz,
    "actual_start_at" timestamptz,
    "actual_end_at" timestamptz,
    "instruction" text,
    "pdf_url" varchar(255),
    "assigned_to" varchar(50),
    "issued_by" varchar(50),
    "issued_at" timestamptz,
    "approved_by" varchar(50),
    "approved_at" timestamptz,
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_work_order" PRIMARY KEY ("work_order_id")
);

CREATE TABLE IF NOT EXISTS "work_order_item" (
    "work_order_item_id" varchar(50) NOT NULL,
    "work_order_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "process_id" varchar(50),
    "bom_line_id" varchar(50),
    "direction" varchar(10) NOT NULL,
    "required_qty" numeric(14,4) NOT NULL,
    "planned_qty" numeric(14,4),
    "actual_qty" numeric(14,4),
    "unit" varchar(20) NOT NULL,
    "item_status" varchar(20) DEFAULT 'pending',
    "note" text,
    "sort_order" integer DEFAULT 0,
    CONSTRAINT "pk_work_order_item" PRIMARY KEY ("work_order_item_id")
);

CREATE TABLE IF NOT EXISTS "production_run" (
    "production_run_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50),
    "work_order_id" varchar(50),
    "bom_id" varchar(50),
    "bom_version" integer,
    "run_number" varchar(30) NOT NULL UNIQUE,
    "run_type" varchar(20) DEFAULT 'actual',
    "run_status" varchar(20) DEFAULT 'pending',
    "target_item_id" varchar(50),
    "planned_output_qty" numeric(14,4) NOT NULL,
    "actual_output_qty" numeric(14,4),
    "good_qty" numeric(14,4),
    "defect_qty" numeric(14,4),
    "yield_rate" numeric(5,4),
    "planned_start_at" timestamptz,
    "planned_end_at" timestamptz,
    "actual_start_at" timestamptz,
    "actual_end_at" timestamptz,
    "planned_duration_min" integer,
    "simulation_config" jsonb DEFAULT '{}'::jsonb,
    "simulation_result" jsonb DEFAULT '{}'::jsonb,
    "bottleneck_process_id" varchar(50),
    "total_material_cost" numeric(16,4),
    "total_energy_cost" numeric(16,4),
    "total_labor_cost" numeric(16,4),
    "total_cost" numeric(16,4),
    "cost_per_unit" numeric(16,4),
    "note" text,
    "started_by" varchar(50),
    "finished_by" varchar(50),
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_production_run" PRIMARY KEY ("production_run_id")
);

CREATE TABLE IF NOT EXISTS "production_run_item" (
    "production_run_item_id" varchar(50) NOT NULL,
    "production_run_id" varchar(50) NOT NULL,
    "process_id" varchar(50),
    "process_io_id" varchar(50),
    "inventory_id" varchar(50),
    "item_id" varchar(50) NOT NULL,
    "lot_id" varchar(50),
    "direction" varchar(10) NOT NULL,
    "planned_qty" numeric(14,4) NOT NULL,
    "actual_qty" numeric(14,4),
    "variance_qty" numeric(14,4),
    "loss_qty" numeric(14,4),
    "unit" varchar(20) NOT NULL,
    "unit_cost_snapshot" numeric(14,4),
    "lot_no" varchar(100),
    "quantity_source" varchar(30) DEFAULT 'bom',
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_production_run_item" PRIMARY KEY ("production_run_item_id")
);

CREATE TABLE IF NOT EXISTS "run_state_snapshot" (
    "run_state_snapshot_id" varchar(50) NOT NULL,
    "production_run_id" varchar(50) NOT NULL,
    "snapshot_name" varchar(100),
    "snapshot_type" varchar(30) DEFAULT 'manual',
    "snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "note" text,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_run_state_snapshot" PRIMARY KEY ("run_state_snapshot_id")
);

CREATE TABLE IF NOT EXISTS "stock_alert" (
    "stock_alert_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "inventory_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "alert_type" varchar(20) DEFAULT 'low' NOT NULL,
    "severity" varchar(20) DEFAULT 'warning',
    "threshold_value" numeric(14,4) NOT NULL,
    "actual_value" numeric(14,4) NOT NULL,
    "alert_message" text,
    "resolved_yn" char(1) DEFAULT 'N',
    "resolved_at" timestamptz,
    "resolved_by" varchar(50),
    "triggered_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_stock_alert" PRIMARY KEY ("stock_alert_id")
);

CREATE TABLE IF NOT EXISTS "defect_log" (
    "defect_log_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "production_run_id" varchar(50),
    "process_id" varchar(50),
    "item_id" varchar(50) NOT NULL,
    "lot_id" varchar(50),
    "inspection_id" varchar(50),
    "defect_code" varchar(50),
    "defect_type" varchar(50),
    "defect_location" varchar(100),
    "quantity" numeric(14,4) NOT NULL,
    "severity" varchar(20) DEFAULT 'minor',
    "reason" text,
    "action_taken" text,
    "image_url" varchar(255),
    "resolved_yn" char(1) DEFAULT 'N',
    "resolved_at" timestamptz,
    "detected_at" timestamptz,
    "logged_by" varchar(50),
    "resolved_by" varchar(50),
    "logged_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_defect_log" PRIMARY KEY ("defect_log_id")
);

CREATE TABLE IF NOT EXISTS "quality_inspection" (
    "inspection_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "production_run_id" varchar(50),
    "process_id" varchar(50),
    "item_id" varchar(50),
    "lot_id" varchar(50),
    "inspection_type" varchar(50),
    "result_status" varchar(20) DEFAULT 'pending',
    "measured_value" numeric(14,4),
    "standard_min" numeric(14,4),
    "standard_max" numeric(14,4),
    "unit" varchar(20),
    "note" text,
    "inspected_by" varchar(50),
    "inspected_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_quality_inspection" PRIMARY KEY ("inspection_id")
);

CREATE TABLE IF NOT EXISTS "lot_master" (
    "lot_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "item_id" varchar(50) NOT NULL,
    "inventory_id" varchar(50),
    "production_run_id" varchar(50),
    "lot_no" varchar(100) NOT NULL,
    "serial_no" varchar(100),
    "produced_at" timestamptz,
    "received_at" timestamptz,
    "expiry_date" date,
    "lot_status" varchar(20) DEFAULT 'available',
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_lot_master" PRIMARY KEY ("lot_id")
);

CREATE TABLE IF NOT EXISTS "lot_trace" (
    "lot_trace_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "parent_lot_id" varchar(50) NOT NULL,
    "child_lot_id" varchar(50) NOT NULL,
    "production_run_id" varchar(50),
    "process_id" varchar(50),
    "consumed_qty" numeric(14,4),
    "produced_qty" numeric(14,4),
    "unit" varchar(20),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_lot_trace" PRIMARY KEY ("lot_trace_id")
);

CREATE TABLE IF NOT EXISTS "project_file" (
    "project_file_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50),
    "process_id" varchar(50),
    "target_type" varchar(50) DEFAULT 'project',
    "target_id" varchar(50),
    "file_type" varchar(30) NOT NULL,
    "original_filename" varchar(255) NOT NULL,
    "stored_filename" varchar(255),
    "file_url" varchar(255) NOT NULL,
    "mime_type" varchar(100),
    "file_size" bigint,
    "file_desc" text,
    "file_status" varchar(20) DEFAULT 'active',
    "version_no" integer DEFAULT 1,
    "checksum" varchar(255),
    "uploaded_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_project_file" PRIMARY KEY ("project_file_id")
);

CREATE TABLE IF NOT EXISTS "project_export" (
    "export_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50),
    "export_type" varchar(20) NOT NULL,
    "file_url" varchar(255) NOT NULL,
    "canvas_snapshot" jsonb DEFAULT '{}'::jsonb,
    "export_option" jsonb DEFAULT '{}'::jsonb,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_project_export" PRIMARY KEY ("export_id")
);

CREATE TABLE IF NOT EXISTS "cad_import_job" (
    "cad_job_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50),
    "job_type" varchar(20) NOT NULL,
    "job_status" varchar(20) DEFAULT 'pending',
    "source_file_id" varchar(50),
    "result_file_url" varchar(255),
    "result_message" text,
    "mapping_data" jsonb DEFAULT '{}'::jsonb,
    "import_option" jsonb DEFAULT '{}'::jsonb,
    "progress_rate" numeric(5,2) DEFAULT 0.0,
    "error_code" varchar(50),
    "created_process_count" integer DEFAULT 0,
    "created_connection_count" integer DEFAULT 0,
    "started_at" timestamptz,
    "finished_at" timestamptz,
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_cad_import_job" PRIMARY KEY ("cad_job_id")
);

CREATE TABLE IF NOT EXISTS "simulation_run" (
    "simulation_run_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "workflow_id" varchar(50) NOT NULL,
    "simulation_name" varchar(100),
    "target_item_id" varchar(50),
    "target_quantity" numeric(14,4),
    "simulation_status" varchar(20) DEFAULT 'pending',
    "input_snapshot" jsonb DEFAULT '{}'::jsonb,
    "result_summary" jsonb DEFAULT '{}'::jsonb,
    "bottleneck_process_id" varchar(50),
    "total_duration_min" integer,
    "total_cost" numeric(16,4),
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "finished_at" timestamptz,
    CONSTRAINT "pk_simulation_run" PRIMARY KEY ("simulation_run_id")
);

CREATE TABLE IF NOT EXISTS "simulation_step" (
    "simulation_step_id" varchar(50) NOT NULL,
    "simulation_run_id" varchar(50) NOT NULL,
    "process_id" varchar(50) NOT NULL,
    "step_order" integer,
    "start_time_sec" numeric(12,2),
    "end_time_sec" numeric(12,2),
    "input_data" jsonb DEFAULT '{}'::jsonb,
    "output_data" jsonb DEFAULT '{}'::jsonb,
    "waiting_time_sec" numeric(12,2),
    "cost" numeric(16,4),
    "result_message" text,
    CONSTRAINT "pk_simulation_step" PRIMARY KEY ("simulation_step_id")
);

CREATE TABLE IF NOT EXISTS "project_activity_log" (
    "activity_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "user_id" varchar(50),
    "action_type" varchar(50) NOT NULL,
    "target_type" varchar(50) NOT NULL,
    "target_id" varchar(50),
    "before_data" jsonb,
    "after_data" jsonb,
    "description" text,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_project_activity_log" PRIMARY KEY ("activity_id")
);

CREATE TABLE IF NOT EXISTS "project_comment" (
    "comment_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "target_type" varchar(50) NOT NULL,
    "target_id" varchar(50) NOT NULL,
    "comment_body" text NOT NULL,
    "parent_comment_id" varchar(50),
    "resolved_yn" char(1) DEFAULT 'N',
    "created_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_project_comment" PRIMARY KEY ("comment_id")
);

CREATE TABLE IF NOT EXISTS "plan" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "plan_code" varchar(30) NOT NULL,
    "plan_name" varchar(100) NOT NULL,
    "plan_desc" text,
    "max_users" integer DEFAULT 1 NOT NULL,
    "max_factories" integer DEFAULT 1 NOT NULL,
    "plan_status" varchar(20) DEFAULT 'active' NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_plan" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plan_pricing" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "plan_id" uuid NOT NULL,
    "billing_months" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "discount_rate" numeric(5,2) DEFAULT 0.0 NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "currency" char(3) DEFAULT 'krw' NOT NULL,
    "is_active" char(1) DEFAULT 'Y' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_plan_pricing" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscription" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(50) NOT NULL,
    "plan_id" uuid NOT NULL,
    "plan_pricing_id" uuid NOT NULL,
    "billing_type" varchar(20) DEFAULT 'subscription' NOT NULL,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "started_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expired_at" timestamptz NOT NULL,
    "next_billing_at" timestamptz,
    "auto_renew" char(1) DEFAULT 'Y' NOT NULL,
    "cancelled_at" timestamptz,
    "cancel_reason" text,
    "trial_ends_at" timestamptz,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_subscription" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar(50) NOT NULL,
    "subscription_id" uuid NOT NULL,
    "plan_pricing_id" uuid NOT NULL,
    "coupon_id" uuid,
    "promotion_id" uuid,
    "original_amount" numeric(12,2) NOT NULL,
    "discount_amount" numeric(12,2) DEFAULT 0.0 NOT NULL,
    "final_amount" numeric(12,2) NOT NULL,
    "currency" char(3) DEFAULT 'KRW' NOT NULL,
    "payment_method" varchar(30) NOT NULL,
    "payment_status" varchar(30) DEFAULT 'pending' NOT NULL,
    "pg_provider" varchar(30),
    "pg_transaction_id" varchar(200),
    "paid_at" timestamptz,
    "refund_amount" numeric(12,2),
    "refunded_at" timestamptz,
    "failure_reason" text,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_payment" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "coupon" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "coupon_code" varchar(50) NOT NULL,
    "coupon_name" varchar(100) NOT NULL,
    "discount_type" varchar(10) NOT NULL,
    "discount_value" numeric(12,2) NOT NULL,
    "max_discount_amount" numeric(12,2),
    "min_order_amount" numeric(12,2),
    "usage_limit" integer,
    "used_count" integer DEFAULT 0 NOT NULL,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamptz NOT NULL,
    "valid_until" timestamptz,
    "coupon_status" varchar(20) DEFAULT 'active' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_coupon" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "promotion" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "promotion_name" varchar(100) NOT NULL,
    "promotion_desc" text,
    "discount_type" varchar(10) NOT NULL,
    "discount_value" numeric(12,2) NOT NULL,
    "target_plan_id" uuid,
    "target_billing_months" integer,
    "valid_from" timestamptz NOT NULL,
    "valid_until" timestamptz,
    "promotion_status" varchar(20) DEFAULT 'active' NOT NULL,
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_promotion" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_discount" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "payment_id" uuid NOT NULL,
    "discount_type" varchar(20) NOT NULL,
    "discount_ref_id" uuid,
    "discount_amount" numeric(12,2) NOT NULL,
    "discount_desc" varchar(200),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "pk_payment_discount" PRIMARY KEY ("id")
);

-- Column comments
COMMENT ON COLUMN "users"."id" IS 'id';
COMMENT ON COLUMN "users"."user_id" IS '로그인아이디';
COMMENT ON COLUMN "users"."user_name" IS '회원 이름';
COMMENT ON COLUMN "users"."user_email" IS '회원 이메일';
COMMENT ON COLUMN "users"."user_pwd" IS '회원 패스워드';
COMMENT ON COLUMN "users"."user_birth" IS '회원 생년월일';
COMMENT ON COLUMN "users"."user_tel" IS '회원 전화번호';
COMMENT ON COLUMN "users"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "users"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "users"."user_role" IS '회원 권한';
COMMENT ON COLUMN "users"."lastlogin_at" IS '마지막 로그인';
COMMENT ON COLUMN "users"."pwd_updated_at" IS '마지막 비밀번호 변경';
COMMENT ON COLUMN "users"."user_status" IS '회원 상태';
COMMENT ON COLUMN "users"."delete_yn" IS '탈퇴유무';
COMMENT ON COLUMN "users"."avatar_url" IS '프로필 이미지 URL';
COMMENT ON COLUMN "users"."dormant_at" IS '휴면전환 일시';
COMMENT ON COLUMN "users"."dormant_token" IS '휴면해제 토큰';
COMMENT ON COLUMN "users"."withdrawn_at" IS '회원탈퇴 일시';
COMMENT ON COLUMN "users"."email_verified_yn" IS '이메일 인증여부';
COMMENT ON COLUMN "users"."email_verified_at" IS '이메일 인증 시간';
COMMENT ON COLUMN "users"."failed_login_count" IS '로그인 실패 제한';
COMMENT ON COLUMN "users"."locked_at" IS '계정 잠금 시간';
COMMENT ON COLUMN "roles"."role_id" IS '역할 아이디';
COMMENT ON COLUMN "roles"."role_name" IS '역할 이름';
COMMENT ON COLUMN "roles"."role_description" IS '역할 설명';
COMMENT ON COLUMN "roles"."role_is_system" IS '시스템여부';
COMMENT ON COLUMN "roles"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "role_permissions"."role_permissions_id" IS '역할별 권한 아이디';
COMMENT ON COLUMN "role_permissions"."role_id" IS '역할 아이디';
COMMENT ON COLUMN "role_permissions"."resource" IS '자원';
COMMENT ON COLUMN "role_permissions"."action" IS '행동';
COMMENT ON COLUMN "role_permissions"."permission_code" IS '권한 코드(common_code같은 실무에서 유용?)';
COMMENT ON COLUMN "user_roles"."user_roles_id" IS '사용자 역할 아이디';
COMMENT ON COLUMN "user_roles"."user_id" IS '회원 아이디';
COMMENT ON COLUMN "user_roles"."role_id" IS '역할 아이디';
COMMENT ON COLUMN "user_roles"."scope_type" IS '권한 범위 타입(global, project)';
COMMENT ON COLUMN "user_roles"."scope_id" IS '범위 타입 아이디';
COMMENT ON COLUMN "user_roles"."granted_by" IS '권한 부여 사용자';
COMMENT ON COLUMN "user_roles"."granted_at" IS '권한 부여 시간';
COMMENT ON COLUMN "user_login_history"."login_history_id" IS '로그인 이력 아이디';
COMMENT ON COLUMN "user_login_history"."user_id" IS '회원 아이디';
COMMENT ON COLUMN "user_login_history"."login_ip" IS '로그인 IP';
COMMENT ON COLUMN "user_login_history"."user_agent" IS '사용자 브라우저 정보';
COMMENT ON COLUMN "user_login_history"."login_result" IS '로그인 결과';
COMMENT ON COLUMN "user_login_history"."fail_reason" IS '로그인 실패 사유';
COMMENT ON COLUMN "user_login_history"."login_at" IS '로그인 시각';
COMMENT ON COLUMN "user_login_history"."logout_at" IS '로그아웃 시각';
COMMENT ON COLUMN "user_login_history"."refresh_token_id" IS '리프레시 토큰 식별자';
COMMENT ON COLUMN "notification"."nfc_id" IS '알람ID';
COMMENT ON COLUMN "notification"."user_id" IS '사용자 아이디';
COMMENT ON COLUMN "notification"."nfc_type" IS '알림 타입';
COMMENT ON COLUMN "notification"."nfc_title" IS '알림 제목';
COMMENT ON COLUMN "notification"."nfc_body" IS '알림 내용';
COMMENT ON COLUMN "notification"."ref_type" IS '참조 타입';
COMMENT ON COLUMN "notification"."ref_id" IS '참조 내용';
COMMENT ON COLUMN "notification"."is_read" IS '읽음 여부';
COMMENT ON COLUMN "notification"."read_at" IS '읽음 시간';
COMMENT ON COLUMN "notification"."created_at" IS '생성 시간';
COMMENT ON COLUMN "resource_types"."rs_type_id" IS '자원 타입 아이디';
COMMENT ON COLUMN "resource_types"."rs_code" IS '자원 코드';
COMMENT ON COLUMN "resource_types"."rs_name" IS '자원명';
COMMENT ON COLUMN "resource_types"."rs_unit" IS '단위';
COMMENT ON COLUMN "resource_types"."created_at" IS '생성일';
COMMENT ON COLUMN "resources"."rs_id" IS '자원 아이디';
COMMENT ON COLUMN "resources"."machine_id" IS '설비 아이디';
COMMENT ON COLUMN "resources"."rs_type_id" IS '자원 타입 아이디';
COMMENT ON COLUMN "resources"."meter_no" IS '계량기 번호';
COMMENT ON COLUMN "resources"."installed_at" IS '설치일';
COMMENT ON COLUMN "resources"."is_active" IS '활성 여부';
COMMENT ON COLUMN "resource_usage"."rs_usage_id" IS '사용량 아이디';
COMMENT ON COLUMN "resource_usage"."rs_id" IS '자원 아이디';
COMMENT ON COLUMN "resource_usage"."measured_at" IS '측정 시각';
COMMENT ON COLUMN "resource_usage"."usage_amount" IS '사용량';
COMMENT ON COLUMN "resource_usage"."source_type" IS '입력 방식';
COMMENT ON COLUMN "resource_usage"."created_at" IS '생성일';
COMMENT ON COLUMN "project"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project"."project_name" IS '프로젝트 이름';
COMMENT ON COLUMN "project"."owner_id" IS '프로젝트 소유자 ID';
COMMENT ON COLUMN "project"."project_desc" IS '프로젝트 설명';
COMMENT ON COLUMN "project"."project_status" IS '프로젝트 상태 active, archived, template, deleted';
COMMENT ON COLUMN "project"."project_type" IS '프로젝트 유형 production, simulation, template';
COMMENT ON COLUMN "project"."industry_type" IS '산업 분야 food, cosmetics, assembly, logistics 등';
COMMENT ON COLUMN "project"."visibility" IS '공개 범위 private, shared, public';
COMMENT ON COLUMN "project"."thumbnail_url" IS '프로젝트 대표 이미지 URL';
COMMENT ON COLUMN "project"."canvas_zoom" IS '캔버스 확대 비율';
COMMENT ON COLUMN "project"."canvas_offset_x" IS '캔버스 X축 이동값';
COMMENT ON COLUMN "project"."canvas_offset_y" IS '캔버스 Y축 이동값';
COMMENT ON COLUMN "project"."canvas_width" IS '캔버스 너비';
COMMENT ON COLUMN "project"."canvas_height" IS '캔버스 높이';
COMMENT ON COLUMN "project"."grid_size" IS '캔버스 그리드 크기';
COMMENT ON COLUMN "project"."snap_enabled" IS '그리드 스냅 사용 여부 Y/N';
COMMENT ON COLUMN "project"."project_version" IS '프로젝트 버전 번호';
COMMENT ON COLUMN "project"."current_workflow_id" IS '대표 또는 마지막 워크플로우 ID';
COMMENT ON COLUMN "project"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "project"."updated_by" IS '마지막 수정자 ID';
COMMENT ON COLUMN "project"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "project"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "project"."last_saved_at" IS '마지막 저장 날짜';
COMMENT ON COLUMN "project"."archived_at" IS '보관 처리 날짜';
COMMENT ON COLUMN "project"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "project"."deleted_at" IS '삭제 날짜';
COMMENT ON COLUMN "project_member"."project_member_id" IS '프로젝트 멤버 ID';
COMMENT ON COLUMN "project_member"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_member"."user_id" IS '사용자 ID';
COMMENT ON COLUMN "project_member"."project_role" IS '프로젝트 권한 owner, admin, editor, operator, viewer';
COMMENT ON COLUMN "project_member"."member_status" IS '멤버 상태 active, invited, left, removed';
COMMENT ON COLUMN "project_member"."invited_by" IS '초대한 사용자 ID';
COMMENT ON COLUMN "project_member"."joined_at" IS '참여 시각';
COMMENT ON COLUMN "project_member"."last_accessed_at" IS '마지막 프로젝트 접근 시각';
COMMENT ON COLUMN "project_member"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "project_member"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "project_permission"."project_permission_id" IS '프로젝트 권한 ID';
COMMENT ON COLUMN "project_permission"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_permission"."project_role" IS '프로젝트 역할 owner, admin, editor, operator, viewer';
COMMENT ON COLUMN "project_permission"."resource_type" IS '대상 기능 project, workflow, process, inventory 등';
COMMENT ON COLUMN "project_permission"."action_type" IS '동작 read, create, update, delete, execute, export, import, invite';
COMMENT ON COLUMN "project_permission"."allow_yn" IS '허용 여부 Y/N';
COMMENT ON COLUMN "project_permission"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "project_permission"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "project_invite"."invite_id" IS '초대 ID';
COMMENT ON COLUMN "project_invite"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_invite"."invited_email" IS '초대받은 이메일';
COMMENT ON COLUMN "project_invite"."invited_user_id" IS '초대받은 사용자 ID';
COMMENT ON COLUMN "project_invite"."project_role" IS '부여할 프로젝트 권한';
COMMENT ON COLUMN "project_invite"."invite_status" IS '초대 상태 pending, accepted, rejected, expired, cancelled';
COMMENT ON COLUMN "project_invite"."invite_token" IS '초대 토큰';
COMMENT ON COLUMN "project_invite"."invited_by" IS '초대한 사용자 ID';
COMMENT ON COLUMN "project_invite"."accepted_at" IS '수락 시각';
COMMENT ON COLUMN "project_invite"."expired_at" IS '만료 시각';
COMMENT ON COLUMN "project_invite"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "workflow"."workflow_id" IS '워크플로우 ID';
COMMENT ON COLUMN "workflow"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "workflow"."workflow_name" IS '워크플로우 이름';
COMMENT ON COLUMN "workflow"."workflow_desc" IS '워크플로우 설명';
COMMENT ON COLUMN "workflow"."workflow_type" IS '공정도 유형 main, sub, simulation';
COMMENT ON COLUMN "workflow"."workflow_status" IS '상태 active, inactive, archived, deleted';
COMMENT ON COLUMN "workflow"."is_main_yn" IS '대표 워크플로우 여부 Y/N';
COMMENT ON COLUMN "workflow"."location" IS '실제 라인 위치 또는 구역';
COMMENT ON COLUMN "workflow"."capacity_per_hour" IS '시간당 처리 가능 수량';
COMMENT ON COLUMN "workflow"."operating_hours_per_day" IS '일일 가동 시간';
COMMENT ON COLUMN "workflow"."workflow_version" IS '워크플로우 버전';
COMMENT ON COLUMN "workflow"."canvas_snapshot" IS '워크플로우 캔버스 스냅샷';
COMMENT ON COLUMN "workflow"."simulation_config" IS '시뮬레이션 설정값';
COMMENT ON COLUMN "workflow"."locked_yn" IS '편집 잠금 여부 Y/N';
COMMENT ON COLUMN "workflow"."locked_by" IS '잠근 사용자 ID';
COMMENT ON COLUMN "workflow"."locked_at" IS '잠금 시각';
COMMENT ON COLUMN "workflow"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "workflow"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "workflow"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "workflow"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "workflow"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "workflow"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "process_template"."template_id" IS '공정 템플릿 ID';
COMMENT ON COLUMN "process_template"."template_name" IS '템플릿 이름';
COMMENT ON COLUMN "process_template"."template_category" IS '템플릿 분류 process, equipment, storage, transport 등';
COMMENT ON COLUMN "process_template"."template_type" IS '템플릿 유형 process, equipment, storage';
COMMENT ON COLUMN "process_template"."icon_key" IS '아이콘 키';
COMMENT ON COLUMN "process_template"."default_width" IS '기본 블록 너비';
COMMENT ON COLUMN "process_template"."default_height" IS '기본 블록 높이';
COMMENT ON COLUMN "process_template"."default_duration_min" IS '기본 공정 시간';
COMMENT ON COLUMN "process_template"."default_worker_count" IS '기본 작업자 수';
COMMENT ON COLUMN "process_template"."default_temperature_c" IS '기본 온도';
COMMENT ON COLUMN "process_template"."default_pressure_kpa" IS '기본 압력';
COMMENT ON COLUMN "process_template"."default_energy_kwh" IS '기본 전력 사용량';
COMMENT ON COLUMN "process_template"."default_water_liter" IS '기본 물 사용량';
COMMENT ON COLUMN "process_template"."default_desc" IS '기본 설명';
COMMENT ON COLUMN "process_template"."default_config" IS '템플릿별 추가 설정값';
COMMENT ON COLUMN "process_template"."public_yn" IS '기본 제공 여부 Y/N';
COMMENT ON COLUMN "process_template"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "process_template"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "process_template"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "process_template"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "workflow_template"."template_id" IS '공정 템플릿 ID';
COMMENT ON COLUMN "workflow_template"."template_name" IS '템플릿 이름';
COMMENT ON COLUMN "workflow_template"."template_category" IS '템플릿 분류 process, equipment, storage, transport 등';
COMMENT ON COLUMN "workflow_template"."template_type" IS '템플릿 유형 process, equipment, storage';
COMMENT ON COLUMN "workflow_template"."icon_key" IS '아이콘 키';
COMMENT ON COLUMN "workflow_template"."default_width" IS '기본 블록 너비';
COMMENT ON COLUMN "workflow_template"."default_height" IS '기본 블록 높이';
COMMENT ON COLUMN "workflow_template"."default_duration_min" IS '기본 공정 시간';
COMMENT ON COLUMN "workflow_template"."default_worker_count" IS '기본 작업자 수';
COMMENT ON COLUMN "workflow_template"."default_temperature_c" IS '기본 온도';
COMMENT ON COLUMN "workflow_template"."default_pressure_kpa" IS '기본 압력';
COMMENT ON COLUMN "workflow_template"."default_energy_kwh" IS '기본 전력 사용량';
COMMENT ON COLUMN "workflow_template"."default_water_liter" IS '기본 물 사용량';
COMMENT ON COLUMN "workflow_template"."default_desc" IS '기본 설명';
COMMENT ON COLUMN "workflow_template"."default_config" IS '템플릿별 추가 설정값';
COMMENT ON COLUMN "workflow_template"."public_yn" IS '기본 제공 여부 Y/N';
COMMENT ON COLUMN "workflow_template"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "workflow_template"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "workflow_template"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "workflow_template"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "process"."process_id" IS '프로세스 ID';
COMMENT ON COLUMN "process"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "process"."workflow_id" IS '소속 워크플로우 ID';
COMMENT ON COLUMN "process"."template_id" IS '원본 템플릿 ID';
COMMENT ON COLUMN "process"."process_code" IS '공정 코드';
COMMENT ON COLUMN "process"."process_name" IS '프로세스 이름';
COMMENT ON COLUMN "process"."process_type" IS '공정 유형 mixing, heating, packaging 등';
COMMENT ON COLUMN "process"."node_type" IS '노드 유형 process, equipment, storage, input, output';
COMMENT ON COLUMN "process"."parent_process_id" IS '상위 공정 ID';
COMMENT ON COLUMN "process"."equipment_id" IS '연결된 설비 ID';
COMMENT ON COLUMN "process"."process_status" IS '상태 draft, active, inactive, error';
COMMENT ON COLUMN "process"."lane" IS '레인 또는 구역';
COMMENT ON COLUMN "process"."pos_x" IS '캔버스 X 좌표';
COMMENT ON COLUMN "process"."pos_y" IS '캔버스 Y 좌표';
COMMENT ON COLUMN "process"."width" IS '블록 너비';
COMMENT ON COLUMN "process"."height" IS '블록 높이';
COMMENT ON COLUMN "process"."rotation" IS '회전 각도';
COMMENT ON COLUMN "process"."z_index" IS '화면 겹침 순서';
COMMENT ON COLUMN "process"."locked_yn" IS '위치 잠금 여부 Y/N';
COMMENT ON COLUMN "process"."process_desc" IS '프로세스 설명';
COMMENT ON COLUMN "process"."worker_count" IS '작업자 수';
COMMENT ON COLUMN "process"."duration_min" IS '공정 소요 시간';
COMMENT ON COLUMN "process"."cycle_time_sec" IS '제품 1개당 처리 시간';
COMMENT ON COLUMN "process"."setup_time_min" IS '준비 시간';
COMMENT ON COLUMN "process"."wait_time_min" IS '대기 시간';
COMMENT ON COLUMN "process"."batch_size" IS '1회 배치 수량';
COMMENT ON COLUMN "process"."batch_unit" IS '배치 단위';
COMMENT ON COLUMN "process"."capacity_per_hour" IS '시간당 처리량';
COMMENT ON COLUMN "process"."min_capacity" IS '최소 처리량';
COMMENT ON COLUMN "process"."max_capacity" IS '최대 처리량';
COMMENT ON COLUMN "process"."temperature_c" IS '공정 온도';
COMMENT ON COLUMN "process"."pressure_kpa" IS '공정 압력';
COMMENT ON COLUMN "process"."humidity_pct" IS '습도';
COMMENT ON COLUMN "process"."energy_kwh" IS '전력 사용량';
COMMENT ON COLUMN "process"."water_liter" IS '물 사용량';
COMMENT ON COLUMN "process"."cost_per_run" IS '1회 실행 비용';
COMMENT ON COLUMN "process"."yield_rate" IS '수율';
COMMENT ON COLUMN "process"."availability_rate" IS '가동률';
COMMENT ON COLUMN "process"."changeover_time_min" IS '제품 전환 시간';
COMMENT ON COLUMN "process"."changeover_cost" IS '제품 전환 비용';
COMMENT ON COLUMN "process"."input_policy" IS '투입 정책 manual, auto, sensor';
COMMENT ON COLUMN "process"."output_policy" IS '산출 정책 manual, auto, calculated';
COMMENT ON COLUMN "process"."quality_check_yn" IS '품질검사 여부 Y/N';
COMMENT ON COLUMN "process"."inspection_standard" IS '검사 기준';
COMMENT ON COLUMN "process"."icon_key" IS '아이콘 키';
COMMENT ON COLUMN "process"."color_scheme" IS '색상 테마';
COMMENT ON COLUMN "process"."metadata" IS '기타 설정값';
COMMENT ON COLUMN "process"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "process"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "process"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "process"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "process"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "process"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "process"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "process_io"."process_io_id" IS '공정 입출력 ID';
COMMENT ON COLUMN "process_io"."process_id" IS '프로세스 ID';
COMMENT ON COLUMN "process_io"."item_id" IS '품목 ID';
COMMENT ON COLUMN "process_io"."io_name" IS '입출력명';
COMMENT ON COLUMN "process_io"."direction" IS '입출력 방향 input, output';
COMMENT ON COLUMN "process_io"."io_type" IS '입출력 유형 material, energy, water, waste';
COMMENT ON COLUMN "process_io"."port_key" IS '포트 식별자';
COMMENT ON COLUMN "process_io"."source_type" IS '입력 출처 inventory, previous_process, manual';
COMMENT ON COLUMN "process_io"."target_type" IS '출력 대상 inventory, next_process, waste';
COMMENT ON COLUMN "process_io"."quantity" IS '필요 또는 산출 수량';
COMMENT ON COLUMN "process_io"."unit" IS '단위';
COMMENT ON COLUMN "process_io"."quantity_basis" IS '수량 기준 per_run, per_unit, per_hour';
COMMENT ON COLUMN "process_io"."formula" IS '수량 계산식';
COMMENT ON COLUMN "process_io"."min_quantity" IS '최소 수량';
COMMENT ON COLUMN "process_io"."max_quantity" IS '최대 수량';
COMMENT ON COLUMN "process_io"."loss_rate" IS '손실률';
COMMENT ON COLUMN "process_io"."required_yn" IS '필수 여부 Y/N';
COMMENT ON COLUMN "process_io"."allow_shortage_yn" IS '부족 시 실행 허용 여부 Y/N';
COMMENT ON COLUMN "process_io"."consume_timing" IS '차감 시점 start, end, realtime';
COMMENT ON COLUMN "process_io"."produce_timing" IS '생성 시점 start, end, realtime';
COMMENT ON COLUMN "process_io"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "process_io"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "process_io"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "process_io"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "process_io"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "process_io"."batch_size" IS '1회 배치 수량';
COMMENT ON COLUMN "process_io"."batch_unit" IS '배치 단위';
COMMENT ON COLUMN "process_io"."capacity_per_hour" IS '시간당 처리량';
COMMENT ON COLUMN "process_io"."min_capacity" IS '최소 처리량';
COMMENT ON COLUMN "process_io"."max_capacity" IS '최대 처리량';
COMMENT ON COLUMN "process_io"."temperature_c" IS '공정 온도';
COMMENT ON COLUMN "process_io"."pressure_kpa" IS '공정 압력';
COMMENT ON COLUMN "process_io"."humidity_pct" IS '습도';
COMMENT ON COLUMN "process_io"."energy_kwh" IS '전력 사용량';
COMMENT ON COLUMN "process_io"."water_liter" IS '물 사용량';
COMMENT ON COLUMN "process_io"."cost_per_run" IS '1회 실행 비용';
COMMENT ON COLUMN "process_io"."yield_rate" IS '수율';
COMMENT ON COLUMN "process_io"."availability_rate" IS '가동률';
COMMENT ON COLUMN "process_io"."changeover_time_min" IS '제품 전환 시간';
COMMENT ON COLUMN "process_io"."changeover_cost" IS '제품 전환 비용';
COMMENT ON COLUMN "process_io"."input_policy" IS '투입 정책 manual, auto, sensor';
COMMENT ON COLUMN "process_io"."output_policy" IS '산출 정책 manual, auto, calculated';
COMMENT ON COLUMN "process_io"."quality_check_yn" IS '품질검사 여부 Y/N';
COMMENT ON COLUMN "process_io"."inspection_standard" IS '검사 기준';
COMMENT ON COLUMN "process_io"."icon_key" IS '아이콘 키';
COMMENT ON COLUMN "process_io"."color_scheme" IS '색상 테마';
COMMENT ON COLUMN "process_io"."metadata" IS '기타 설정값';
COMMENT ON COLUMN "process_io"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "process_io"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "process_connection"."connection_id" IS '연결선 ID';
COMMENT ON COLUMN "process_connection"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "process_connection"."workflow_id" IS '소속 워크플로우 ID';
COMMENT ON COLUMN "process_connection"."from_process_id" IS '시작 프로세스 ID';
COMMENT ON COLUMN "process_connection"."to_process_id" IS '도착 프로세스 ID';
COMMENT ON COLUMN "process_connection"."from_io_id" IS '출발 process_io ID';
COMMENT ON COLUMN "process_connection"."to_io_id" IS '도착 process_io ID';
COMMENT ON COLUMN "process_connection"."item_id" IS '연결선을 통해 흐르는 품목/자원 ID';
COMMENT ON COLUMN "process_connection"."source_handle" IS '시작 포트 위치';
COMMENT ON COLUMN "process_connection"."target_handle" IS '도착 포트 위치';
COMMENT ON COLUMN "process_connection"."line_type" IS '연결선 유형 main, sub, utility, quality';
COMMENT ON COLUMN "process_connection"."connection_type" IS '흐름 유형 material, energy, water, data, worker';
COMMENT ON COLUMN "process_connection"."flow_direction" IS '흐름 방향 forward, backward, bidirectional';
COMMENT ON COLUMN "process_connection"."connection_label" IS '연결선 라벨';
COMMENT ON COLUMN "process_connection"."flow_rate" IS '흐름량';
COMMENT ON COLUMN "process_connection"."min_flow_rate" IS '최소 흐름량';
COMMENT ON COLUMN "process_connection"."max_flow_rate" IS '최대 흐름량';
COMMENT ON COLUMN "process_connection"."unit" IS '흐름 단위';
COMMENT ON COLUMN "process_connection"."delay_time_sec" IS '이동 지연 시간';
COMMENT ON COLUMN "process_connection"."distance_meter" IS '실제 거리 m';
COMMENT ON COLUMN "process_connection"."loss_rate" IS '이동 중 손실률';
COMMENT ON COLUMN "process_connection"."priority" IS '흐름 우선순위';
COMMENT ON COLUMN "process_connection"."waypoints" IS '꺾은선 좌표 정보';
COMMENT ON COLUMN "process_connection"."style" IS '연결선 스타일 정보';
COMMENT ON COLUMN "process_connection"."flow_condition" IS '흐름 조건';
COMMENT ON COLUMN "process_connection"."animated_yn" IS '흐름 애니메이션 여부 Y/N';
COMMENT ON COLUMN "process_connection"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "process_connection"."metadata" IS '기타 연결 정보';
COMMENT ON COLUMN "process_connection"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "process_connection"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "process_connection"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "process_connection"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "process_connection"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "item"."item_id" IS 'Resource ID';
COMMENT ON COLUMN "item"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "item"."item_code" IS 'Resource 코드';
COMMENT ON COLUMN "item"."item_name" IS 'Resource 이름';
COMMENT ON COLUMN "item"."item_type" IS '기존 품목 유형 raw, sub, semi, finished, resource, waste 등';
COMMENT ON COLUMN "item"."item_category" IS '기존 품목 카테고리';
COMMENT ON COLUMN "item"."resource_category" IS '범용 Resource 대분류 material, energy, fluid, data, document, human, equipment, space, time, signal, waste';
COMMENT ON COLUMN "item"."resource_type" IS 'Resource 세부 유형 raw_material, finished_product, electricity, water, json, csv, worker, chef, forklift, error_log, wastewater 등';
COMMENT ON COLUMN "item"."domain_resource_type_id" IS '도메인별 Resource 타입 ID';
COMMENT ON COLUMN "item"."item_group" IS 'Resource 그룹';
COMMENT ON COLUMN "item"."item_status" IS 'Resource 상태 active, inactive, discontinued';
COMMENT ON COLUMN "item"."unit" IS '기본 표시 단위';
COMMENT ON COLUMN "item"."unit_id" IS '기본 단위 ID';
COMMENT ON COLUMN "item"."purchase_unit" IS '구매 단위';
COMMENT ON COLUMN "item"."production_unit" IS '생산 또는 처리 단위';
COMMENT ON COLUMN "item"."conversion_rate" IS '기본 단위와 사용 단위 간 변환율';
COMMENT ON COLUMN "item"."unit_cost" IS '단가 또는 단위 비용';
COMMENT ON COLUMN "item"."cost_calc_type" IS '비용 계산 방식 per_quantity, per_time, fixed, formula';
COMMENT ON COLUMN "item"."spec" IS '규격';
COMMENT ON COLUMN "item"."spec_json" IS '파일 스키마, 장비 스펙, 데이터 구조, 환경 조건 등 구조화된 규격';
COMMENT ON COLUMN "item"."barcode" IS '바코드';
COMMENT ON COLUMN "item"."sku" IS 'SKU';
COMMENT ON COLUMN "item"."item_desc" IS 'Resource 설명';
COMMENT ON COLUMN "item"."stock_managed_yn" IS '수량 또는 재고 관리 여부 Y/N';
COMMENT ON COLUMN "item"."metered_yn" IS '계량기, 센서, 사용량 기반 측정 대상 여부 Y/N';
COMMENT ON COLUMN "item"."consumable_yn" IS '사용 시 소비되는 Resource 여부 Y/N';
COMMENT ON COLUMN "item"."reusable_yn" IS '재사용 가능한 Resource 여부 Y/N';
COMMENT ON COLUMN "item"."physical_yn" IS '물리적 대상 여부 Y/N';
COMMENT ON COLUMN "item"."digital_yn" IS '디지털 데이터, 파일, API 응답 등 디지털 대상 여부 Y/N';
COMMENT ON COLUMN "item"."stateful_yn" IS '상태 추적 대상 여부 Y/N';
COMMENT ON COLUMN "item"."safety_stock_qty" IS '안전재고 수량';
COMMENT ON COLUMN "item"."lead_time_days" IS '조달, 준비, 생성에 필요한 리드타임';
COMMENT ON COLUMN "item"."storage_condition" IS '보관 조건';
COMMENT ON COLUMN "item"."expiry_manage_yn" IS '유통기한 또는 만료 관리 여부 Y/N';
COMMENT ON COLUMN "item"."lot_manage_yn" IS 'Lot 관리 여부 Y/N';
COMMENT ON COLUMN "item"."serial_manage_yn" IS '시리얼 관리 여부 Y/N';
COMMENT ON COLUMN "item"."allergen_info" IS '알러지 정보';
COMMENT ON COLUMN "item"."hazard_info" IS '위험물, 주의사항, 안전 정보';
COMMENT ON COLUMN "item"."metadata" IS '도메인별 추가 속성';
COMMENT ON COLUMN "item"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "item"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "item"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "item"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "item"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "item"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "unit_master"."unit_id" IS '단위 ID';
COMMENT ON COLUMN "unit_master"."unit_code" IS '단위 코드 kg, g, L, ml, kWh 등';
COMMENT ON COLUMN "unit_master"."unit_name" IS '단위명';
COMMENT ON COLUMN "unit_master"."unit_type" IS '유형 count, weight, volume, energy, time 등';
COMMENT ON COLUMN "unit_master"."base_unit_code" IS '기준 단위 코드';
COMMENT ON COLUMN "unit_master"."conversion_rate" IS '기준 단위 대비 변환율';
COMMENT ON COLUMN "unit_master"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "unit_master"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "unit_master"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "inventory"."inventory_id" IS '재고 ID';
COMMENT ON COLUMN "inventory"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "inventory"."item_id" IS '품목 ID';
COMMENT ON COLUMN "inventory"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "inventory"."quantity" IS '현재 재고 수량';
COMMENT ON COLUMN "inventory"."reserved_quantity" IS '예약 수량';
COMMENT ON COLUMN "inventory"."available_quantity" IS '사용 가능 수량';
COMMENT ON COLUMN "inventory"."inbound_expected_qty" IS '입고 예정 수량';
COMMENT ON COLUMN "inventory"."outbound_expected_qty" IS '출고 예정 수량';
COMMENT ON COLUMN "inventory"."min_threshold" IS '최소 재고 기준';
COMMENT ON COLUMN "inventory"."max_threshold" IS '최대 재고 기준';
COMMENT ON COLUMN "inventory"."inventory_status" IS '상태 available, reserved, blocked, expired';
COMMENT ON COLUMN "inventory"."location" IS '재고 위치';
COMMENT ON COLUMN "inventory"."warehouse_code" IS '창고 코드';
COMMENT ON COLUMN "inventory"."zone" IS '창고 구역';
COMMENT ON COLUMN "inventory"."lot_no" IS '로트 번호';
COMMENT ON COLUMN "inventory"."expiry_date" IS '유통기한 또는 사용기한';
COMMENT ON COLUMN "inventory"."locked_yn" IS '재고 잠금 여부 Y/N';
COMMENT ON COLUMN "inventory"."last_checked_at" IS '마지막 실사 시각';
COMMENT ON COLUMN "inventory"."last_checked_by" IS '마지막 실사자 ID';
COMMENT ON COLUMN "inventory"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "inventory"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "inventory"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "inventory"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "inventory"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "inventory_transaction"."inventory_id" IS '재고 ID';
COMMENT ON COLUMN "inventory_transaction"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "inventory_transaction"."item_id" IS '품목 ID';
COMMENT ON COLUMN "inventory_transaction"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "inventory_transaction"."quantity" IS '현재 재고 수량';
COMMENT ON COLUMN "inventory_transaction"."reserved_quantity" IS '예약 수량';
COMMENT ON COLUMN "inventory_transaction"."available_quantity" IS '사용 가능 수량';
COMMENT ON COLUMN "inventory_transaction"."inbound_expected_qty" IS '입고 예정 수량';
COMMENT ON COLUMN "inventory_transaction"."outbound_expected_qty" IS '출고 예정 수량';
COMMENT ON COLUMN "inventory_transaction"."min_threshold" IS '최소 재고 기준';
COMMENT ON COLUMN "inventory_transaction"."max_threshold" IS '최대 재고 기준';
COMMENT ON COLUMN "inventory_transaction"."inventory_status" IS '상태 available, reserved, blocked, expired';
COMMENT ON COLUMN "inventory_transaction"."location" IS '재고 위치';
COMMENT ON COLUMN "inventory_transaction"."warehouse_code" IS '창고 코드';
COMMENT ON COLUMN "inventory_transaction"."zone" IS '창고 구역';
COMMENT ON COLUMN "inventory_transaction"."lot_no" IS '로트 번호';
COMMENT ON COLUMN "inventory_transaction"."expiry_date" IS '유통기한 또는 사용기한';
COMMENT ON COLUMN "inventory_transaction"."locked_yn" IS '재고 잠금 여부 Y/N';
COMMENT ON COLUMN "inventory_transaction"."last_checked_at" IS '마지막 실사 시각';
COMMENT ON COLUMN "inventory_transaction"."last_checked_by" IS '마지막 실사자 ID';
COMMENT ON COLUMN "inventory_transaction"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "inventory_transaction"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "inventory_transaction"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "inventory_transaction"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "inventory_transaction"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "bom_header"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "bom_header"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "bom_header"."target_item_id" IS 'BOM 대상 완제품/반제품 ID';
COMMENT ON COLUMN "bom_header"."bom_name" IS 'BOM 이름';
COMMENT ON COLUMN "bom_header"."bom_version" IS 'BOM 버전';
COMMENT ON COLUMN "bom_header"."base_quantity" IS '기준 생산 수량';
COMMENT ON COLUMN "bom_header"."base_unit" IS '기준 단위';
COMMENT ON COLUMN "bom_header"."output_quantity" IS '기준 생산 수량';
COMMENT ON COLUMN "bom_header"."bom_status" IS 'BOM 상태 draft, active, archived';
COMMENT ON COLUMN "bom_header"."approval_status" IS '승인 상태 draft, approved, rejected';
COMMENT ON COLUMN "bom_header"."approved_by" IS '승인자 ID';
COMMENT ON COLUMN "bom_header"."approved_at" IS '승인 시각';
COMMENT ON COLUMN "bom_header"."active_yn" IS '활성 여부 Y/N';
COMMENT ON COLUMN "bom_header"."effective_from" IS '적용 시작일';
COMMENT ON COLUMN "bom_header"."effective_to" IS '적용 종료일';
COMMENT ON COLUMN "bom_header"."note" IS '비고';
COMMENT ON COLUMN "bom_header"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "bom_header"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "bom_header"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "bom_header"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "bom_header"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "bom_line"."bom_line_id" IS 'BOM 상세 ID';
COMMENT ON COLUMN "bom_line"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "bom_line"."child_item_id" IS '하위 자재 품목 ID';
COMMENT ON COLUMN "bom_line"."line_type" IS '라인 유형 material, energy, water, packaging, labor';
COMMENT ON COLUMN "bom_line"."quantity" IS '필요 수량';
COMMENT ON COLUMN "bom_line"."unit" IS '단위';
COMMENT ON COLUMN "bom_line"."scrap_rate" IS '손실률';
COMMENT ON COLUMN "bom_line"."optional_yn" IS '선택 자재 여부 Y/N';
COMMENT ON COLUMN "bom_line"."substitute_group" IS '대체 자재 그룹';
COMMENT ON COLUMN "bom_line"."priority" IS '대체 우선순위';
COMMENT ON COLUMN "bom_line"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "bom_line"."note" IS '비고';
COMMENT ON COLUMN "bom_line"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "bom_line"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "bom_line"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "equipment"."equipment_id" IS '설비 ID';
COMMENT ON COLUMN "equipment"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "equipment"."equipment_code" IS '설비 코드';
COMMENT ON COLUMN "equipment"."equipment_name" IS '설비 이름';
COMMENT ON COLUMN "equipment"."equipment_type" IS '설비 유형 conveyor, mixer, robot_arm 등';
COMMENT ON COLUMN "equipment"."manufacturer" IS '제조사';
COMMENT ON COLUMN "equipment"."model_name" IS '모델명';
COMMENT ON COLUMN "equipment"."serial_no" IS '시리얼 번호';
COMMENT ON COLUMN "equipment"."capacity_per_hour" IS '시간당 처리량';
COMMENT ON COLUMN "equipment"."power_kwh" IS '전력 사용량';
COMMENT ON COLUMN "equipment"."water_liter" IS '물 사용량';
COMMENT ON COLUMN "equipment"."equipment_status" IS '상태 active, inactive, maintenance, broken';
COMMENT ON COLUMN "equipment"."location" IS '설비 위치';
COMMENT ON COLUMN "equipment"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "equipment"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "equipment"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "equipment"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "equipment"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "work_order"."work_order_id" IS '작업지시서 ID';
COMMENT ON COLUMN "work_order"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "work_order"."workflow_id" IS '대상 워크플로우 ID';
COMMENT ON COLUMN "work_order"."bom_id" IS '사용할 BOM ID';
COMMENT ON COLUMN "work_order"."work_order_number" IS '작업지시서 번호';
COMMENT ON COLUMN "work_order"."work_order_title" IS '작업지시서 제목';
COMMENT ON COLUMN "work_order"."work_order_status" IS '상태 draft, issued, running, completed, cancelled';
COMMENT ON COLUMN "work_order"."priority" IS '우선순위 low, normal, high, urgent';
COMMENT ON COLUMN "work_order"."target_item_id" IS '목표 품목 ID';
COMMENT ON COLUMN "work_order"."target_quantity" IS '목표 생산 수량';
COMMENT ON COLUMN "work_order"."planned_start_at" IS '계획 시작 시각';
COMMENT ON COLUMN "work_order"."planned_end_at" IS '계획 종료 시각';
COMMENT ON COLUMN "work_order"."actual_start_at" IS '실제 시작 시각';
COMMENT ON COLUMN "work_order"."actual_end_at" IS '실제 종료 시각';
COMMENT ON COLUMN "work_order"."instruction" IS '작업 지시 내용';
COMMENT ON COLUMN "work_order"."pdf_url" IS '출력 PDF 경로';
COMMENT ON COLUMN "work_order"."assigned_to" IS '담당자 ID';
COMMENT ON COLUMN "work_order"."issued_by" IS '발행자 ID';
COMMENT ON COLUMN "work_order"."issued_at" IS '발행 시각';
COMMENT ON COLUMN "work_order"."approved_by" IS '승인자 ID';
COMMENT ON COLUMN "work_order"."approved_at" IS '승인 시각';
COMMENT ON COLUMN "work_order"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "work_order"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "work_order"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "work_order"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "work_order"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "work_order_item"."work_order_item_id" IS '작업지시서 품목 ID';
COMMENT ON COLUMN "work_order_item"."work_order_id" IS '작업지시서 ID';
COMMENT ON COLUMN "work_order_item"."item_id" IS '품목 ID';
COMMENT ON COLUMN "work_order_item"."process_id" IS '대상 공정 ID';
COMMENT ON COLUMN "work_order_item"."bom_line_id" IS '관련 BOM 라인 ID';
COMMENT ON COLUMN "work_order_item"."direction" IS '방향 input, output';
COMMENT ON COLUMN "work_order_item"."required_qty" IS '필요 수량';
COMMENT ON COLUMN "work_order_item"."planned_qty" IS '계획 수량';
COMMENT ON COLUMN "work_order_item"."actual_qty" IS '실제 수량';
COMMENT ON COLUMN "work_order_item"."unit" IS '단위';
COMMENT ON COLUMN "work_order_item"."item_status" IS '상태 pending, done, skipped';
COMMENT ON COLUMN "work_order_item"."note" IS '비고';
COMMENT ON COLUMN "work_order_item"."sort_order" IS '표시 순서';
COMMENT ON COLUMN "production_run"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "production_run"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "production_run"."workflow_id" IS '실행 대상 워크플로우 ID';
COMMENT ON COLUMN "production_run"."work_order_id" IS '연결 작업지시서 ID';
COMMENT ON COLUMN "production_run"."bom_id" IS '사용 BOM ID';
COMMENT ON COLUMN "production_run"."bom_version" IS '사용 BOM 버전';
COMMENT ON COLUMN "production_run"."run_number" IS '생산 실행 번호';
COMMENT ON COLUMN "production_run"."run_type" IS '실행 유형 actual, simulation';
COMMENT ON COLUMN "production_run"."run_status" IS '실행 상태 pending, running, done, cancelled, failed';
COMMENT ON COLUMN "production_run"."target_item_id" IS '생산 목표 품목 ID';
COMMENT ON COLUMN "production_run"."planned_output_qty" IS '계획 생산 수량';
COMMENT ON COLUMN "production_run"."actual_output_qty" IS '실제 생산 수량';
COMMENT ON COLUMN "production_run"."good_qty" IS '양품 수량';
COMMENT ON COLUMN "production_run"."defect_qty" IS '불량 수량';
COMMENT ON COLUMN "production_run"."yield_rate" IS '수율';
COMMENT ON COLUMN "production_run"."planned_start_at" IS '계획 시작 시각';
COMMENT ON COLUMN "production_run"."planned_end_at" IS '계획 종료 시각';
COMMENT ON COLUMN "production_run"."actual_start_at" IS '실제 시작 시각';
COMMENT ON COLUMN "production_run"."actual_end_at" IS '실제 종료 시각';
COMMENT ON COLUMN "production_run"."planned_duration_min" IS '계획 소요 시간';
COMMENT ON COLUMN "production_run"."simulation_config" IS '시뮬레이션 설정';
COMMENT ON COLUMN "production_run"."simulation_result" IS '시뮬레이션 결과 요약';
COMMENT ON COLUMN "production_run"."bottleneck_process_id" IS '병목 공정 ID';
COMMENT ON COLUMN "production_run"."total_material_cost" IS '총 재료비';
COMMENT ON COLUMN "production_run"."total_energy_cost" IS '총 에너지비';
COMMENT ON COLUMN "production_run"."total_labor_cost" IS '총 인건비';
COMMENT ON COLUMN "production_run"."total_cost" IS '총 원가';
COMMENT ON COLUMN "production_run"."cost_per_unit" IS '개당 원가';
COMMENT ON COLUMN "production_run"."note" IS '비고';
COMMENT ON COLUMN "production_run"."started_by" IS '실행 시작자 ID';
COMMENT ON COLUMN "production_run"."finished_by" IS '실행 완료자 ID';
COMMENT ON COLUMN "production_run"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "production_run"."updated_by" IS '수정자 ID';
COMMENT ON COLUMN "production_run"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "production_run"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "production_run_item"."production_run_item_id" IS '생산 실행 품목 ID';
COMMENT ON COLUMN "production_run_item"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "production_run_item"."process_id" IS '관련 공정 ID';
COMMENT ON COLUMN "production_run_item"."process_io_id" IS '관련 공정 입출력 ID';
COMMENT ON COLUMN "production_run_item"."inventory_id" IS '반영 재고 ID';
COMMENT ON COLUMN "production_run_item"."item_id" IS '품목 ID';
COMMENT ON COLUMN "production_run_item"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "production_run_item"."direction" IS '방향 consumed, produced';
COMMENT ON COLUMN "production_run_item"."planned_qty" IS '계획 수량';
COMMENT ON COLUMN "production_run_item"."actual_qty" IS '실제 수량';
COMMENT ON COLUMN "production_run_item"."variance_qty" IS '계획 대비 차이 수량';
COMMENT ON COLUMN "production_run_item"."loss_qty" IS '손실 수량';
COMMENT ON COLUMN "production_run_item"."unit" IS '단위';
COMMENT ON COLUMN "production_run_item"."unit_cost_snapshot" IS '당시 단가';
COMMENT ON COLUMN "production_run_item"."lot_no" IS '로트 번호';
COMMENT ON COLUMN "production_run_item"."quantity_source" IS '수량 출처 manual, bom, process_io, sensor';
COMMENT ON COLUMN "production_run_item"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "stock_alert"."stock_alert_id" IS '재고 알림 ID';
COMMENT ON COLUMN "stock_alert"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "stock_alert"."inventory_id" IS '재고 ID';
COMMENT ON COLUMN "stock_alert"."item_id" IS '품목 ID';
COMMENT ON COLUMN "stock_alert"."alert_type" IS '알림 유형 low, out, over, expired';
COMMENT ON COLUMN "stock_alert"."severity" IS '심각도 info, warning, critical';
COMMENT ON COLUMN "stock_alert"."threshold_value" IS '기준 수량';
COMMENT ON COLUMN "stock_alert"."actual_value" IS '실제 수량';
COMMENT ON COLUMN "stock_alert"."alert_message" IS '알림 메시지';
COMMENT ON COLUMN "stock_alert"."resolved_yn" IS '해결 여부 Y/N';
COMMENT ON COLUMN "stock_alert"."resolved_at" IS '해결 시각';
COMMENT ON COLUMN "stock_alert"."resolved_by" IS '해결자 ID';
COMMENT ON COLUMN "stock_alert"."triggered_at" IS '알림 발생 시각';
COMMENT ON COLUMN "stock_alert"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "defect_log"."defect_log_id" IS '불량 기록 ID';
COMMENT ON COLUMN "defect_log"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "defect_log"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "defect_log"."process_id" IS '불량 발생 프로세스 ID';
COMMENT ON COLUMN "defect_log"."item_id" IS '불량 품목 ID';
COMMENT ON COLUMN "defect_log"."lot_id" IS '불량 발생 Lot ID';
COMMENT ON COLUMN "defect_log"."inspection_id" IS '검사 기록 ID';
COMMENT ON COLUMN "defect_log"."defect_code" IS '불량 코드';
COMMENT ON COLUMN "defect_log"."defect_type" IS '불량 유형';
COMMENT ON COLUMN "defect_log"."defect_location" IS '불량 발생 위치';
COMMENT ON COLUMN "defect_log"."quantity" IS '불량 수량';
COMMENT ON COLUMN "defect_log"."severity" IS '심각도 minor, major, critical';
COMMENT ON COLUMN "defect_log"."reason" IS '불량 원인';
COMMENT ON COLUMN "defect_log"."action_taken" IS '조치 내용';
COMMENT ON COLUMN "defect_log"."image_url" IS '불량 이미지 URL';
COMMENT ON COLUMN "defect_log"."resolved_yn" IS '해결 여부 Y/N';
COMMENT ON COLUMN "defect_log"."resolved_at" IS '해결 시각';
COMMENT ON COLUMN "defect_log"."detected_at" IS '발견 시각';
COMMENT ON COLUMN "defect_log"."logged_by" IS '입력자 ID';
COMMENT ON COLUMN "defect_log"."resolved_by" IS '해결자 ID';
COMMENT ON COLUMN "defect_log"."logged_at" IS '입력 시각';
COMMENT ON COLUMN "quality_inspection"."inspection_id" IS '검사 ID';
COMMENT ON COLUMN "quality_inspection"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "quality_inspection"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "quality_inspection"."process_id" IS '검사 공정 ID';
COMMENT ON COLUMN "quality_inspection"."item_id" IS '검사 품목 ID';
COMMENT ON COLUMN "quality_inspection"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "quality_inspection"."inspection_type" IS '검사 유형 visual, weight, temperature 등';
COMMENT ON COLUMN "quality_inspection"."result_status" IS '검사 결과 pass, fail, pending';
COMMENT ON COLUMN "quality_inspection"."measured_value" IS '측정값';
COMMENT ON COLUMN "quality_inspection"."standard_min" IS '기준 최소값';
COMMENT ON COLUMN "quality_inspection"."standard_max" IS '기준 최대값';
COMMENT ON COLUMN "quality_inspection"."unit" IS '측정 단위';
COMMENT ON COLUMN "quality_inspection"."note" IS '비고';
COMMENT ON COLUMN "quality_inspection"."inspected_by" IS '검사자 ID';
COMMENT ON COLUMN "quality_inspection"."inspected_at" IS '검사 시각';
COMMENT ON COLUMN "lot_master"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "lot_master"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "lot_master"."item_id" IS '품목 ID';
COMMENT ON COLUMN "lot_master"."inventory_id" IS '재고 ID';
COMMENT ON COLUMN "lot_master"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "lot_master"."lot_no" IS 'Lot 번호';
COMMENT ON COLUMN "lot_master"."serial_no" IS '시리얼 번호';
COMMENT ON COLUMN "lot_master"."produced_at" IS '생산 시각';
COMMENT ON COLUMN "lot_master"."received_at" IS '입고 시각';
COMMENT ON COLUMN "lot_master"."expiry_date" IS '유통기한';
COMMENT ON COLUMN "lot_master"."lot_status" IS '상태 available, used, blocked, expired, recalled';
COMMENT ON COLUMN "lot_master"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "lot_master"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "lot_trace"."lot_trace_id" IS 'Lot 추적 ID';
COMMENT ON COLUMN "lot_trace"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "lot_trace"."parent_lot_id" IS '투입 Lot ID';
COMMENT ON COLUMN "lot_trace"."child_lot_id" IS '산출 Lot ID';
COMMENT ON COLUMN "lot_trace"."production_run_id" IS '생산 실행 ID';
COMMENT ON COLUMN "lot_trace"."process_id" IS '관련 공정 ID';
COMMENT ON COLUMN "lot_trace"."consumed_qty" IS '투입 수량';
COMMENT ON COLUMN "lot_trace"."produced_qty" IS '산출 수량';
COMMENT ON COLUMN "lot_trace"."unit" IS '단위';
COMMENT ON COLUMN "lot_trace"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "project_file"."project_file_id" IS '프로젝트 파일 ID';
COMMENT ON COLUMN "project_file"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_file"."workflow_id" IS '관련 워크플로우 ID';
COMMENT ON COLUMN "project_file"."process_id" IS '관련 공정 ID';
COMMENT ON COLUMN "project_file"."target_type" IS '연결 대상 project, workflow, process, defect 등';
COMMENT ON COLUMN "project_file"."target_id" IS '연결 대상 ID';
COMMENT ON COLUMN "project_file"."file_type" IS '파일 유형 image, pdf, cad, excel, document';
COMMENT ON COLUMN "project_file"."original_filename" IS '원본 파일명';
COMMENT ON COLUMN "project_file"."stored_filename" IS '저장 파일명';
COMMENT ON COLUMN "project_file"."file_url" IS '파일 경로 또는 URL';
COMMENT ON COLUMN "project_file"."mime_type" IS 'MIME 타입';
COMMENT ON COLUMN "project_file"."file_size" IS '파일 크기 byte';
COMMENT ON COLUMN "project_file"."file_desc" IS '파일 설명';
COMMENT ON COLUMN "project_file"."file_status" IS '상태 active, deleted, archived';
COMMENT ON COLUMN "project_file"."version_no" IS '파일 버전';
COMMENT ON COLUMN "project_file"."checksum" IS '파일 무결성 해시';
COMMENT ON COLUMN "project_file"."uploaded_by" IS '업로드자 ID';
COMMENT ON COLUMN "project_file"."created_at" IS '업로드 날짜';
COMMENT ON COLUMN "project_file"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "project_export"."export_id" IS '내보내기 ID';
COMMENT ON COLUMN "project_export"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_export"."workflow_id" IS '내보내기 대상 워크플로우 ID';
COMMENT ON COLUMN "project_export"."export_type" IS '내보내기 유형 pdf, png, svg, excel';
COMMENT ON COLUMN "project_export"."file_url" IS '저장 파일 경로';
COMMENT ON COLUMN "project_export"."canvas_snapshot" IS '내보내기 당시 캔버스 상태';
COMMENT ON COLUMN "project_export"."export_option" IS '내보내기 옵션';
COMMENT ON COLUMN "project_export"."created_by" IS '생성자 ID';
COMMENT ON COLUMN "project_export"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "cad_import_job"."cad_job_id" IS 'CAD 작업 ID';
COMMENT ON COLUMN "cad_import_job"."project_id" IS '소속 프로젝트 ID';
COMMENT ON COLUMN "cad_import_job"."workflow_id" IS '대상 워크플로우 ID';
COMMENT ON COLUMN "cad_import_job"."job_type" IS '작업 유형 import, export';
COMMENT ON COLUMN "cad_import_job"."job_status" IS '작업 상태 pending, processing, done, failed';
COMMENT ON COLUMN "cad_import_job"."source_file_id" IS '원본 프로젝트 파일 ID';
COMMENT ON COLUMN "cad_import_job"."result_file_url" IS '결과 파일 URL';
COMMENT ON COLUMN "cad_import_job"."result_message" IS '작업 결과 메시지';
COMMENT ON COLUMN "cad_import_job"."mapping_data" IS 'CAD 객체와 공정 블록 매핑 정보';
COMMENT ON COLUMN "cad_import_job"."import_option" IS '가져오기 옵션';
COMMENT ON COLUMN "cad_import_job"."progress_rate" IS '진행률 0~100';
COMMENT ON COLUMN "cad_import_job"."error_code" IS '에러 코드';
COMMENT ON COLUMN "cad_import_job"."created_process_count" IS '생성된 공정 블록 수';
COMMENT ON COLUMN "cad_import_job"."created_connection_count" IS '생성된 연결선 수';
COMMENT ON COLUMN "cad_import_job"."started_at" IS '작업 시작 시각';
COMMENT ON COLUMN "cad_import_job"."finished_at" IS '작업 종료 시각';
COMMENT ON COLUMN "cad_import_job"."created_by" IS '작업 요청자 ID';
COMMENT ON COLUMN "cad_import_job"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "cad_import_job"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "simulation_run"."simulation_run_id" IS '시뮬레이션 실행 ID';
COMMENT ON COLUMN "simulation_run"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "simulation_run"."workflow_id" IS '대상 워크플로우 ID';
COMMENT ON COLUMN "simulation_run"."simulation_name" IS '시뮬레이션 이름';
COMMENT ON COLUMN "simulation_run"."target_item_id" IS '목표 품목 ID';
COMMENT ON COLUMN "simulation_run"."target_quantity" IS '목표 생산 수량';
COMMENT ON COLUMN "simulation_run"."simulation_status" IS '상태 pending, running, done, failed';
COMMENT ON COLUMN "simulation_run"."input_snapshot" IS '실행 당시 입력 데이터';
COMMENT ON COLUMN "simulation_run"."result_summary" IS '결과 요약';
COMMENT ON COLUMN "simulation_run"."bottleneck_process_id" IS '병목 공정 ID';
COMMENT ON COLUMN "simulation_run"."total_duration_min" IS '총 소요 시간';
COMMENT ON COLUMN "simulation_run"."total_cost" IS '총 비용';
COMMENT ON COLUMN "simulation_run"."created_by" IS '실행자 ID';
COMMENT ON COLUMN "simulation_run"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "simulation_run"."finished_at" IS '완료 시각';
COMMENT ON COLUMN "simulation_step"."simulation_step_id" IS '시뮬레이션 단계 ID';
COMMENT ON COLUMN "simulation_step"."simulation_run_id" IS '시뮬레이션 실행 ID';
COMMENT ON COLUMN "simulation_step"."process_id" IS '공정 ID';
COMMENT ON COLUMN "simulation_step"."step_order" IS '실행 순서';
COMMENT ON COLUMN "simulation_step"."start_time_sec" IS '시작 시간 초';
COMMENT ON COLUMN "simulation_step"."end_time_sec" IS '종료 시간 초';
COMMENT ON COLUMN "simulation_step"."input_data" IS '투입 데이터';
COMMENT ON COLUMN "simulation_step"."output_data" IS '산출 데이터';
COMMENT ON COLUMN "simulation_step"."waiting_time_sec" IS '대기 시간';
COMMENT ON COLUMN "simulation_step"."cost" IS '단계 비용';
COMMENT ON COLUMN "simulation_step"."result_message" IS '결과 메시지';
COMMENT ON COLUMN "project_activity_log"."activity_id" IS '활동 로그 ID';
COMMENT ON COLUMN "project_activity_log"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_activity_log"."user_id" IS '수행 사용자 ID';
COMMENT ON COLUMN "project_activity_log"."action_type" IS 'create, update, delete, execute, export, import, invite 등';
COMMENT ON COLUMN "project_activity_log"."target_type" IS '대상 유형 project, workflow, process, inventory 등';
COMMENT ON COLUMN "project_activity_log"."target_id" IS '대상 ID';
COMMENT ON COLUMN "project_activity_log"."before_data" IS '변경 전 데이터';
COMMENT ON COLUMN "project_activity_log"."after_data" IS '변경 후 데이터';
COMMENT ON COLUMN "project_activity_log"."description" IS '활동 설명';
COMMENT ON COLUMN "project_activity_log"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "project_comment"."comment_id" IS '댓글 ID';
COMMENT ON COLUMN "project_comment"."project_id" IS '프로젝트 ID';
COMMENT ON COLUMN "project_comment"."target_type" IS '대상 project, workflow, process, inventory 등';
COMMENT ON COLUMN "project_comment"."target_id" IS '대상 ID';
COMMENT ON COLUMN "project_comment"."comment_body" IS '댓글 내용';
COMMENT ON COLUMN "project_comment"."parent_comment_id" IS '부모 댓글 ID';
COMMENT ON COLUMN "project_comment"."resolved_yn" IS '해결 여부 Y/N';
COMMENT ON COLUMN "project_comment"."created_by" IS '작성자 ID';
COMMENT ON COLUMN "project_comment"."created_at" IS '작성 시각';
COMMENT ON COLUMN "project_comment"."updated_at" IS '수정 시각';
COMMENT ON COLUMN "project_comment"."deleted_yn" IS '삭제 여부 Y/N';
COMMENT ON COLUMN "plan"."id" IS '요금제 아이디';
COMMENT ON COLUMN "plan"."plan_code" IS '요금제 코드';
COMMENT ON COLUMN "plan"."plan_name" IS '요금제 표시명';
COMMENT ON COLUMN "plan"."plan_desc" IS '요금제 설명';
COMMENT ON COLUMN "plan"."max_users" IS '허용 사용자 수';
COMMENT ON COLUMN "plan"."max_factories" IS '결제 금액허용 공장 수';
COMMENT ON COLUMN "plan"."plan_status" IS '요금제 상태';
COMMENT ON COLUMN "plan"."display_order" IS '화면 표시 순서';
COMMENT ON COLUMN "plan"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "plan"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "plan_pricing"."plan_id" IS '요금제 ID';
COMMENT ON COLUMN "plan_pricing"."billing_months" IS '결제 개월수 1 / 3 / 6 / 12';
COMMENT ON COLUMN "plan_pricing"."unit_price" IS '월 단가 (원)';
COMMENT ON COLUMN "plan_pricing"."discount_rate" IS '할인율 (%) ex) 0.00 / 5.00 / 10.00';
COMMENT ON COLUMN "plan_pricing"."total_price" IS '최종 결제 금액 unit_price × months × (1 - rate/100)';
COMMENT ON COLUMN "plan_pricing"."currency" IS '통화 코드';
COMMENT ON COLUMN "plan_pricing"."is_active" IS '활성 여부';
COMMENT ON COLUMN "plan_pricing"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "plan_pricing"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "subscription"."user_id" IS '회원 아이디';
COMMENT ON COLUMN "subscription"."plan_id" IS '요금제 아이디';
COMMENT ON COLUMN "subscription"."plan_pricing_id" IS '결제 단가 정책 아이디';
COMMENT ON COLUMN "subscription"."billing_type" IS '결제 방식 subscription (자동갱신) / one_time (기간 일회성)';
COMMENT ON COLUMN "subscription"."status" IS '구독 상태 active / expired / cancelled / paused / trial';
COMMENT ON COLUMN "subscription"."started_at" IS '구독 시작 일시';
COMMENT ON COLUMN "subscription"."expired_at" IS '구독 만료 일시';
COMMENT ON COLUMN "subscription"."next_billing_at" IS '다음 결제 예정일 NULL = one_time일 때';
COMMENT ON COLUMN "subscription"."auto_renew" IS '자동 갱신 여부';
COMMENT ON COLUMN "subscription"."cancelled_at" IS '해지 일시';
COMMENT ON COLUMN "subscription"."cancel_reason" IS '해지 사유';
COMMENT ON COLUMN "subscription"."trial_ends_at" IS '무료체험 종료일 NULL = 체험 없음(확장 대비)';
COMMENT ON COLUMN "subscription"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "subscription"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "payment"."user_id" IS '회원 아이디';
COMMENT ON COLUMN "payment"."subscription_id" IS '구독 아이디';
COMMENT ON COLUMN "payment"."plan_pricing_id" IS '결제 시점 단가 정책';
COMMENT ON COLUMN "payment"."coupon_id" IS '쿠폰 아이디';
COMMENT ON COLUMN "payment"."promotion_id" IS '포로모션 아이디';
COMMENT ON COLUMN "payment"."original_amount" IS '할인 전 원래 금액';
COMMENT ON COLUMN "payment"."discount_amount" IS '총 할인 금액';
COMMENT ON COLUMN "payment"."final_amount" IS '실제 결제 금액';
COMMENT ON COLUMN "payment"."currency" IS '통화 코드';
COMMENT ON COLUMN "payment"."payment_method" IS '결제 수단';
COMMENT ON COLUMN "payment"."payment_status" IS '결제 상태';
COMMENT ON COLUMN "payment"."pg_provider" IS 'PG 사';
COMMENT ON COLUMN "payment"."pg_transaction_id" IS 'PG사 트래잭션 아이디';
COMMENT ON COLUMN "payment"."paid_at" IS '결제 완료 일시';
COMMENT ON COLUMN "payment"."refund_amount" IS '환불 금액';
COMMENT ON COLUMN "payment"."refunded_at" IS '환불 일시';
COMMENT ON COLUMN "payment"."failure_reason" IS '결제 실패 사유';
COMMENT ON COLUMN "payment"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "payment"."updated_at" IS '수정 날짜';
COMMENT ON COLUMN "coupon"."coupon_code" IS '쿠폰 코드';
COMMENT ON COLUMN "coupon"."coupon_name" IS '쿠폰명';
COMMENT ON COLUMN "coupon"."discount_type" IS '할인 방식 rate (비율할인) / fixed (정액할인)';
COMMENT ON COLUMN "coupon"."discount_value" IS '할인값 rate: 10.00 = 10% / fixed: 5000 = 5,000원';
COMMENT ON COLUMN "coupon"."max_discount_amount" IS '최대 할인 한도 NULL = 한도 없음';
COMMENT ON COLUMN "coupon"."min_order_amount" IS '최소 결제 금액 NULL = 조건 없음';
COMMENT ON COLUMN "coupon"."usage_limit" IS '총 사용 가능 횟수 NULL = 무제한';
COMMENT ON COLUMN "coupon"."used_count" IS '현재 사용된 횟수';
COMMENT ON COLUMN "coupon"."per_user_limit" IS '1인당 사용 가능 횟수 NULL = 무제한';
COMMENT ON COLUMN "coupon"."valid_from" IS '사용 시작일';
COMMENT ON COLUMN "coupon"."valid_until" IS '사용 종료일 NULL = 기한 없음';
COMMENT ON COLUMN "coupon"."coupon_status" IS '쿠폰 상태 active / inactive / expired';
COMMENT ON COLUMN "coupon"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "promotion"."promotion_name" IS '프로모션명';
COMMENT ON COLUMN "promotion"."promotion_desc" IS '프로모션 설명';
COMMENT ON COLUMN "promotion"."discount_type" IS '할인 방식 rate / fixed';
COMMENT ON COLUMN "promotion"."discount_value" IS '할인값';
COMMENT ON COLUMN "promotion"."target_plan_id" IS '적용 대상 요금제 NULL = 전체 요금제 적용';
COMMENT ON COLUMN "promotion"."target_billing_months" IS '적용 대상 개월수 NULL = 개월수 무관';
COMMENT ON COLUMN "promotion"."valid_from" IS '프로모션 시작일';
COMMENT ON COLUMN "promotion"."valid_until" IS '프로모션 종료일 NULL = 상시 프로모션';
COMMENT ON COLUMN "promotion"."promotion_status" IS '프로모션 상태 active / inactive / ended';
COMMENT ON COLUMN "promotion"."created_at" IS '생성 날짜';
COMMENT ON COLUMN "payment_discount"."payment_id" IS '결제 ID → payment.id';
COMMENT ON COLUMN "payment_discount"."discount_type" IS '할인 출처 plan_discount / coupon / promotion';
COMMENT ON COLUMN "payment_discount"."discount_ref_id" IS '쿠폰/프로모션 참조 ID NULL = plan_discount 타입일 때';
COMMENT ON COLUMN "payment_discount"."discount_amount" IS '이 항목의 할인 금액';
COMMENT ON COLUMN "payment_discount"."discount_desc" IS '할인 설명 ex) "12개월 20% 할인", "신규가입 쿠폰"';
COMMENT ON COLUMN "payment_discount"."created_at" IS '생성 날짜';

-- Indexes for columns marked FK in the WBS
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_id" ON "role_permissions" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_role_id" ON "user_roles" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_granted_by" ON "user_roles" ("granted_by");
CREATE INDEX IF NOT EXISTS "idx_user_login_history_user_id" ON "user_login_history" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notification_user_id" ON "notification" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_resources_machine_id" ON "resources" ("machine_id");
CREATE INDEX IF NOT EXISTS "idx_resources_rs_type_id" ON "resources" ("rs_type_id");
CREATE INDEX IF NOT EXISTS "idx_resource_usage_rs_id" ON "resource_usage" ("rs_id");
CREATE INDEX IF NOT EXISTS "idx_project_owner_id" ON "project" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_project_current_workflow_id" ON "project" ("current_workflow_id");
CREATE INDEX IF NOT EXISTS "idx_project_created_by" ON "project" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_project_updated_by" ON "project" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_project_member_project_id" ON "project_member" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_member_user_id" ON "project_member" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_member_invited_by" ON "project_member" ("invited_by");
CREATE INDEX IF NOT EXISTS "idx_project_permission_project_id" ON "project_permission" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_invite_project_id" ON "project_invite" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_invite_invited_user_id" ON "project_invite" ("invited_user_id");
CREATE INDEX IF NOT EXISTS "idx_project_invite_invited_by" ON "project_invite" ("invited_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_project_id" ON "workflow" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_locked_by" ON "workflow" ("locked_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_created_by" ON "workflow" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_updated_by" ON "workflow" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_process_template_created_by" ON "process_template" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_template_created_by" ON "workflow_template" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_process_project_id" ON "process" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_process_workflow_id" ON "process" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_process_template_id" ON "process" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_process_parent_process_id" ON "process" ("parent_process_id");
CREATE INDEX IF NOT EXISTS "idx_process_equipment_id" ON "process" ("equipment_id");
CREATE INDEX IF NOT EXISTS "idx_process_created_by" ON "process" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_process_updated_by" ON "process" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_process_io_process_id" ON "process_io" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_process_io_item_id" ON "process_io" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_process_io_created_by" ON "process_io" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_process_io_updated_by" ON "process_io" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_process_connection_project_id" ON "process_connection" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_workflow_id" ON "process_connection" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_from_process_id" ON "process_connection" ("from_process_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_to_process_id" ON "process_connection" ("to_process_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_from_io_id" ON "process_connection" ("from_io_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_to_io_id" ON "process_connection" ("to_io_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_item_id" ON "process_connection" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_process_connection_created_by" ON "process_connection" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_process_connection_updated_by" ON "process_connection" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_item_project_id" ON "item" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_item_domain_resource_type_id" ON "item" ("domain_resource_type_id");
CREATE INDEX IF NOT EXISTS "idx_item_unit_id" ON "item" ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_item_created_by" ON "item" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_item_updated_by" ON "item" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_project_id" ON "inventory" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_item_id" ON "inventory" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_lot_id" ON "inventory" ("lot_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_last_checked_by" ON "inventory" ("last_checked_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_created_by" ON "inventory" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_updated_by" ON "inventory" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_project_id" ON "inventory_transaction" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_item_id" ON "inventory_transaction" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_lot_id" ON "inventory_transaction" ("lot_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_last_checked_by" ON "inventory_transaction" ("last_checked_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_created_by" ON "inventory_transaction" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_updated_by" ON "inventory_transaction" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_bom_header_project_id" ON "bom_header" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_bom_header_target_item_id" ON "bom_header" ("target_item_id");
CREATE INDEX IF NOT EXISTS "idx_bom_header_approved_by" ON "bom_header" ("approved_by");
CREATE INDEX IF NOT EXISTS "idx_bom_header_created_by" ON "bom_header" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_bom_header_updated_by" ON "bom_header" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_bom_line_bom_id" ON "bom_line" ("bom_id");
CREATE INDEX IF NOT EXISTS "idx_bom_line_child_item_id" ON "bom_line" ("child_item_id");
CREATE INDEX IF NOT EXISTS "idx_bom_line_created_by" ON "bom_line" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_equipment_project_id" ON "equipment" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_equipment_created_by" ON "equipment" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_equipment_updated_by" ON "equipment" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_work_order_project_id" ON "work_order" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_workflow_id" ON "work_order" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_bom_id" ON "work_order" ("bom_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_target_item_id" ON "work_order" ("target_item_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_assigned_to" ON "work_order" ("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_work_order_issued_by" ON "work_order" ("issued_by");
CREATE INDEX IF NOT EXISTS "idx_work_order_approved_by" ON "work_order" ("approved_by");
CREATE INDEX IF NOT EXISTS "idx_work_order_created_by" ON "work_order" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_work_order_updated_by" ON "work_order" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_work_order_item_work_order_id" ON "work_order_item" ("work_order_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_item_item_id" ON "work_order_item" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_item_process_id" ON "work_order_item" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_work_order_item_bom_line_id" ON "work_order_item" ("bom_line_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_project_id" ON "production_run" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_workflow_id" ON "production_run" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_work_order_id" ON "production_run" ("work_order_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_bom_id" ON "production_run" ("bom_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_target_item_id" ON "production_run" ("target_item_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_bottleneck_process_id" ON "production_run" ("bottleneck_process_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_started_by" ON "production_run" ("started_by");
CREATE INDEX IF NOT EXISTS "idx_production_run_finished_by" ON "production_run" ("finished_by");
CREATE INDEX IF NOT EXISTS "idx_production_run_created_by" ON "production_run" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_production_run_updated_by" ON "production_run" ("updated_by");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_production_run_id" ON "production_run_item" ("production_run_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_process_id" ON "production_run_item" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_process_io_id" ON "production_run_item" ("process_io_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_inventory_id" ON "production_run_item" ("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_item_id" ON "production_run_item" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_production_run_item_lot_id" ON "production_run_item" ("lot_id");
CREATE INDEX IF NOT EXISTS "idx_stock_alert_project_id" ON "stock_alert" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_stock_alert_inventory_id" ON "stock_alert" ("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_stock_alert_item_id" ON "stock_alert" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_stock_alert_resolved_by" ON "stock_alert" ("resolved_by");
CREATE INDEX IF NOT EXISTS "idx_defect_log_project_id" ON "defect_log" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_production_run_id" ON "defect_log" ("production_run_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_process_id" ON "defect_log" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_item_id" ON "defect_log" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_lot_id" ON "defect_log" ("lot_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_inspection_id" ON "defect_log" ("inspection_id");
CREATE INDEX IF NOT EXISTS "idx_defect_log_logged_by" ON "defect_log" ("logged_by");
CREATE INDEX IF NOT EXISTS "idx_defect_log_resolved_by" ON "defect_log" ("resolved_by");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_project_id" ON "quality_inspection" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_production_run_id" ON "quality_inspection" ("production_run_id");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_process_id" ON "quality_inspection" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_item_id" ON "quality_inspection" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_lot_id" ON "quality_inspection" ("lot_id");
CREATE INDEX IF NOT EXISTS "idx_quality_inspection_inspected_by" ON "quality_inspection" ("inspected_by");
CREATE INDEX IF NOT EXISTS "idx_lot_master_project_id" ON "lot_master" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_lot_master_item_id" ON "lot_master" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_lot_master_inventory_id" ON "lot_master" ("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_lot_master_production_run_id" ON "lot_master" ("production_run_id");
CREATE INDEX IF NOT EXISTS "idx_lot_trace_project_id" ON "lot_trace" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_lot_trace_parent_lot_id" ON "lot_trace" ("parent_lot_id");
CREATE INDEX IF NOT EXISTS "idx_lot_trace_child_lot_id" ON "lot_trace" ("child_lot_id");
CREATE INDEX IF NOT EXISTS "idx_lot_trace_production_run_id" ON "lot_trace" ("production_run_id");
CREATE INDEX IF NOT EXISTS "idx_lot_trace_process_id" ON "lot_trace" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_project_file_project_id" ON "project_file" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_file_workflow_id" ON "project_file" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_project_file_process_id" ON "project_file" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_project_file_uploaded_by" ON "project_file" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_project_export_project_id" ON "project_export" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_export_workflow_id" ON "project_export" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_project_export_created_by" ON "project_export" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_cad_import_job_project_id" ON "cad_import_job" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_cad_import_job_workflow_id" ON "cad_import_job" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_cad_import_job_source_file_id" ON "cad_import_job" ("source_file_id");
CREATE INDEX IF NOT EXISTS "idx_cad_import_job_created_by" ON "cad_import_job" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_simulation_run_project_id" ON "simulation_run" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_simulation_run_workflow_id" ON "simulation_run" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_simulation_run_target_item_id" ON "simulation_run" ("target_item_id");
CREATE INDEX IF NOT EXISTS "idx_simulation_run_bottleneck_process_id" ON "simulation_run" ("bottleneck_process_id");
CREATE INDEX IF NOT EXISTS "idx_simulation_run_created_by" ON "simulation_run" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_simulation_step_simulation_run_id" ON "simulation_step" ("simulation_run_id");
CREATE INDEX IF NOT EXISTS "idx_simulation_step_process_id" ON "simulation_step" ("process_id");
CREATE INDEX IF NOT EXISTS "idx_project_activity_log_project_id" ON "project_activity_log" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_activity_log_user_id" ON "project_activity_log" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_comment_project_id" ON "project_comment" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_comment_parent_comment_id" ON "project_comment" ("parent_comment_id");
CREATE INDEX IF NOT EXISTS "idx_project_comment_created_by" ON "project_comment" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_subscription_user_id" ON "subscription" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_id" ON "subscription" ("plan_id");
CREATE INDEX IF NOT EXISTS "idx_subscription_plan_pricing_id" ON "subscription" ("plan_pricing_id");
CREATE INDEX IF NOT EXISTS "idx_payment_user_id" ON "payment" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_subscription_id" ON "payment" ("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_payment_plan_pricing_id" ON "payment" ("plan_pricing_id");
CREATE INDEX IF NOT EXISTS "idx_payment_discount_payment_id" ON "payment_discount" ("payment_id");
