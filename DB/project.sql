-- Auto-generated PostgreSQL DDL from WBS_FlowMat (1).xlsx
-- Source sheets: user technical spec 2, project table technical spec sheet 9
-- Notes:
-- 1) Some FK constraints were converted to indexes because referenced table details were incomplete in the source Excel.
-- 2) datetime and timestamp values were converted to PostgreSQL timestamptz.
-- 3) The pgcrypto extension is enabled to use gen_random_uuid() as the default UUID generator.
-- 4) Several naming typos were normalized for SQL compatibility: plain_id->plan_id, subcription_id->subscription_id, primotion_id->promotion_id, panding->pending.

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
    "is_read" boolean DEFAULT false NOT NULL,
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
    "default_color_scheme" varchar(30) DEFAULT 'slate',
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
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
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
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pk_run_state_snapshot" PRIMARY KEY ("run_state_snapshot_id")
);

CREATE TABLE IF NOT EXISTS "flow_rule" (
    "rule_id" varchar(50) NOT NULL,
    "project_id" varchar(50) NOT NULL,
    "target_type" varchar(50) NOT NULL,
    "target_id" varchar(50) NOT NULL,
    "rule_name" varchar(100) NOT NULL,
    "rule_desc" text,
    "condition_type" varchar(30) DEFAULT 'expression' NOT NULL,
    "condition_expression" text NOT NULL,
    "action_type" varchar(30) DEFAULT 'validate' NOT NULL,
    "action_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "priority" integer DEFAULT 0,
    "enabled_yn" char(1) DEFAULT 'Y',
    "created_by" varchar(50),
    "updated_by" varchar(50),
    "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP,
    "deleted_yn" char(1) DEFAULT 'N',
    CONSTRAINT "pk_flow_rule" PRIMARY KEY ("rule_id")
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
COMMENT ON COLUMN "users"."user_id" IS 'User ID';
COMMENT ON COLUMN "users"."user_name" IS 'User Name';
COMMENT ON COLUMN "users"."user_email" IS 'User Email';
COMMENT ON COLUMN "users"."user_pwd" IS 'User password';
COMMENT ON COLUMN "users"."user_birth" IS 'User Birth';
COMMENT ON COLUMN "users"."user_tel" IS 'User telephone';
COMMENT ON COLUMN "users"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "users"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "users"."user_role" IS 'User Role';
COMMENT ON COLUMN "users"."lastlogin_at" IS 'Lastlogin timestamp';
COMMENT ON COLUMN "users"."pwd_updated_at" IS 'password Updated timestamp';
COMMENT ON COLUMN "users"."user_status" IS 'User Status';
COMMENT ON COLUMN "users"."delete_yn" IS 'Delete flag (Y/N)';
COMMENT ON COLUMN "users"."avatar_url" IS 'Avatar URL';
COMMENT ON COLUMN "users"."dormant_at" IS 'Dormant timestamp';
COMMENT ON COLUMN "users"."dormant_token" IS 'Dormant Token';
COMMENT ON COLUMN "users"."withdrawn_at" IS 'Withdrawn timestamp';
COMMENT ON COLUMN "users"."email_verified_yn" IS 'Email Verified flag (Y/N)';
COMMENT ON COLUMN "users"."email_verified_at" IS 'Email Verified timestamp';
COMMENT ON COLUMN "users"."failed_login_count" IS 'Failed Login Count';
COMMENT ON COLUMN "users"."locked_at" IS 'Locked timestamp';
COMMENT ON COLUMN "roles"."role_id" IS 'Role ID';
COMMENT ON COLUMN "roles"."role_name" IS 'Role Name';
COMMENT ON COLUMN "roles"."role_description" IS 'Role Description';
COMMENT ON COLUMN "roles"."role_is_system" IS 'Role IS System';
COMMENT ON COLUMN "roles"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "role_permissions"."role_permissions_id" IS 'Role Permissions ID';
COMMENT ON COLUMN "role_permissions"."role_id" IS 'Role ID';
COMMENT ON COLUMN "role_permissions"."resource" IS 'Resource';
COMMENT ON COLUMN "role_permissions"."action" IS 'Action';
COMMENT ON COLUMN "role_permissions"."permission_code" IS 'Permission Code';
COMMENT ON COLUMN "user_roles"."user_roles_id" IS 'User Roles ID';
COMMENT ON COLUMN "user_roles"."user_id" IS 'User ID';
COMMENT ON COLUMN "user_roles"."role_id" IS 'Role ID';
COMMENT ON COLUMN "user_roles"."scope_type" IS 'Scope Type';
COMMENT ON COLUMN "user_roles"."scope_id" IS 'Scope ID';
COMMENT ON COLUMN "user_roles"."granted_by" IS 'Granted BY';
COMMENT ON COLUMN "user_roles"."granted_at" IS 'Granted timestamp';
COMMENT ON COLUMN "user_login_history"."login_history_id" IS 'Login History ID';
COMMENT ON COLUMN "user_login_history"."user_id" IS 'User ID';
COMMENT ON COLUMN "user_login_history"."login_ip" IS 'Login IP';
COMMENT ON COLUMN "user_login_history"."user_agent" IS 'User Agent';
COMMENT ON COLUMN "user_login_history"."login_result" IS 'Login Result';
COMMENT ON COLUMN "user_login_history"."fail_reason" IS 'Fail Reason';
COMMENT ON COLUMN "user_login_history"."login_at" IS 'Login timestamp';
COMMENT ON COLUMN "user_login_history"."logout_at" IS 'Logout timestamp';
COMMENT ON COLUMN "user_login_history"."refresh_token_id" IS 'Refresh Token ID';
COMMENT ON COLUMN "notification"."nfc_id" IS 'notification ID';
COMMENT ON COLUMN "notification"."user_id" IS 'User ID';
COMMENT ON COLUMN "notification"."nfc_type" IS 'notification Type';
COMMENT ON COLUMN "notification"."nfc_title" IS 'notification Title';
COMMENT ON COLUMN "notification"."nfc_body" IS 'notification Body';
COMMENT ON COLUMN "notification"."ref_type" IS 'reference Type';
COMMENT ON COLUMN "notification"."ref_id" IS 'reference ID';
COMMENT ON COLUMN "notification"."is_read" IS 'IS Read';
COMMENT ON COLUMN "notification"."read_at" IS 'Read timestamp';
COMMENT ON COLUMN "notification"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "resource_types"."rs_type_id" IS 'RS Type ID';
COMMENT ON COLUMN "resource_types"."rs_code" IS 'RS Code';
COMMENT ON COLUMN "resource_types"."rs_name" IS 'RS Name';
COMMENT ON COLUMN "resource_types"."rs_unit" IS 'RS Unit';
COMMENT ON COLUMN "resource_types"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "resources"."rs_id" IS 'RS ID';
COMMENT ON COLUMN "resources"."machine_id" IS 'Machine ID';
COMMENT ON COLUMN "resources"."rs_type_id" IS 'RS Type ID';
COMMENT ON COLUMN "resources"."meter_no" IS 'Meter number';
COMMENT ON COLUMN "resources"."installed_at" IS 'Installed timestamp';
COMMENT ON COLUMN "resources"."is_active" IS 'IS Active';
COMMENT ON COLUMN "resource_usage"."rs_usage_id" IS 'RS Usage ID';
COMMENT ON COLUMN "resource_usage"."rs_id" IS 'RS ID';
COMMENT ON COLUMN "resource_usage"."measured_at" IS 'Measured timestamp';
COMMENT ON COLUMN "resource_usage"."usage_amount" IS 'Usage Amount';
COMMENT ON COLUMN "resource_usage"."source_type" IS 'Source Type';
COMMENT ON COLUMN "resource_usage"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project"."project_name" IS 'Project Name';
COMMENT ON COLUMN "project"."owner_id" IS 'Owner ID';
COMMENT ON COLUMN "project"."project_desc" IS 'Project description';
COMMENT ON COLUMN "project"."project_status" IS 'Project Status';
COMMENT ON COLUMN "project"."project_type" IS 'Project Type';
COMMENT ON COLUMN "project"."industry_type" IS 'Industry Type';
COMMENT ON COLUMN "project"."visibility" IS 'Visibility';
COMMENT ON COLUMN "project"."thumbnail_url" IS 'Thumbnail URL';
COMMENT ON COLUMN "project"."canvas_zoom" IS 'Canvas Zoom';
COMMENT ON COLUMN "project"."canvas_offset_x" IS 'Canvas Offset X';
COMMENT ON COLUMN "project"."canvas_offset_y" IS 'Canvas Offset Y';
COMMENT ON COLUMN "project"."canvas_width" IS 'Canvas Width';
COMMENT ON COLUMN "project"."canvas_height" IS 'Canvas Height';
COMMENT ON COLUMN "project"."grid_size" IS 'Grid Size';
COMMENT ON COLUMN "project"."snap_enabled" IS 'Snap Enabled';
COMMENT ON COLUMN "project"."project_version" IS 'Project Version';
COMMENT ON COLUMN "project"."current_workflow_id" IS 'Current Workflow ID';
COMMENT ON COLUMN "project"."created_by" IS 'Created BY';
COMMENT ON COLUMN "project"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "project"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "project"."last_saved_at" IS 'Last Saved timestamp';
COMMENT ON COLUMN "project"."archived_at" IS 'Archived timestamp';
COMMENT ON COLUMN "project"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "project"."deleted_at" IS 'Deleted timestamp';
COMMENT ON COLUMN "project_member"."project_member_id" IS 'Project Member ID';
COMMENT ON COLUMN "project_member"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_member"."user_id" IS 'User ID';
COMMENT ON COLUMN "project_member"."project_role" IS 'Project Role';
COMMENT ON COLUMN "project_member"."member_status" IS 'Member Status';
COMMENT ON COLUMN "project_member"."invited_by" IS 'Invited BY';
COMMENT ON COLUMN "project_member"."joined_at" IS 'Joined timestamp';
COMMENT ON COLUMN "project_member"."last_accessed_at" IS 'Last Accessed timestamp';
COMMENT ON COLUMN "project_member"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_member"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "project_permission"."project_permission_id" IS 'Project Permission ID';
COMMENT ON COLUMN "project_permission"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_permission"."project_role" IS 'Project Role';
COMMENT ON COLUMN "project_permission"."resource_type" IS 'Resource Type';
COMMENT ON COLUMN "project_permission"."action_type" IS 'Action Type';
COMMENT ON COLUMN "project_permission"."allow_yn" IS 'Allow flag (Y/N)';
COMMENT ON COLUMN "project_permission"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_permission"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "project_invite"."invite_id" IS 'Invite ID';
COMMENT ON COLUMN "project_invite"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_invite"."invited_email" IS 'Invited Email';
COMMENT ON COLUMN "project_invite"."invited_user_id" IS 'Invited User ID';
COMMENT ON COLUMN "project_invite"."project_role" IS 'Project Role';
COMMENT ON COLUMN "project_invite"."invite_status" IS 'Invite Status';
COMMENT ON COLUMN "project_invite"."invite_token" IS 'Invite Token';
COMMENT ON COLUMN "project_invite"."invited_by" IS 'Invited BY';
COMMENT ON COLUMN "project_invite"."accepted_at" IS 'Accepted timestamp';
COMMENT ON COLUMN "project_invite"."expired_at" IS 'Expired timestamp';
COMMENT ON COLUMN "project_invite"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "workflow"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "workflow"."project_id" IS 'Project ID';
COMMENT ON COLUMN "workflow"."workflow_name" IS 'Workflow Name';
COMMENT ON COLUMN "workflow"."workflow_desc" IS 'Workflow description';
COMMENT ON COLUMN "workflow"."workflow_type" IS 'Workflow Type';
COMMENT ON COLUMN "workflow"."workflow_status" IS 'Workflow Status';
COMMENT ON COLUMN "workflow"."is_main_yn" IS 'IS Main flag (Y/N)';
COMMENT ON COLUMN "workflow"."location" IS 'Location';
COMMENT ON COLUMN "workflow"."capacity_per_hour" IS 'Capacity Per Hour';
COMMENT ON COLUMN "workflow"."operating_hours_per_day" IS 'Operating Hours Per Day';
COMMENT ON COLUMN "workflow"."workflow_version" IS 'Workflow Version';
COMMENT ON COLUMN "workflow"."canvas_snapshot" IS 'Canvas Snapshot';
COMMENT ON COLUMN "workflow"."simulation_config" IS 'Simulation Config';
COMMENT ON COLUMN "workflow"."locked_yn" IS 'Locked flag (Y/N)';
COMMENT ON COLUMN "workflow"."locked_by" IS 'Locked BY';
COMMENT ON COLUMN "workflow"."locked_at" IS 'Locked timestamp';
COMMENT ON COLUMN "workflow"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "workflow"."created_by" IS 'Created BY';
COMMENT ON COLUMN "workflow"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "workflow"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "workflow"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "workflow"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "process_template"."template_id" IS 'Template ID';
COMMENT ON COLUMN "process_template"."template_name" IS 'Template Name';
COMMENT ON COLUMN "process_template"."template_category" IS 'Template Category';
COMMENT ON COLUMN "process_template"."template_type" IS 'Template Type';
COMMENT ON COLUMN "process_template"."icon_key" IS 'Icon Key';
COMMENT ON COLUMN "process_template"."default_color_scheme" IS 'Default Color Scheme';
COMMENT ON COLUMN "process_template"."default_width" IS 'Default Width';
COMMENT ON COLUMN "process_template"."default_height" IS 'Default Height';
COMMENT ON COLUMN "process_template"."default_duration_min" IS 'Default Duration minimum';
COMMENT ON COLUMN "process_template"."default_worker_count" IS 'Default Worker Count';
COMMENT ON COLUMN "process_template"."default_temperature_c" IS 'Default Temperature C';
COMMENT ON COLUMN "process_template"."default_pressure_kpa" IS 'Default Pressure kPa';
COMMENT ON COLUMN "process_template"."default_energy_kwh" IS 'Default Energy kWh';
COMMENT ON COLUMN "process_template"."default_water_liter" IS 'Default Water Liter';
COMMENT ON COLUMN "process_template"."default_desc" IS 'Default description';
COMMENT ON COLUMN "process_template"."default_config" IS 'Default Config';
COMMENT ON COLUMN "process_template"."public_yn" IS 'Public flag (Y/N)';
COMMENT ON COLUMN "process_template"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "process_template"."created_by" IS 'Created BY';
COMMENT ON COLUMN "process_template"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "process_template"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "workflow_template"."template_id" IS 'Template ID';
COMMENT ON COLUMN "workflow_template"."template_name" IS 'Template Name';
COMMENT ON COLUMN "workflow_template"."template_category" IS 'Template Category';
COMMENT ON COLUMN "workflow_template"."template_type" IS 'Template Type';
COMMENT ON COLUMN "workflow_template"."icon_key" IS 'Icon Key';
COMMENT ON COLUMN "workflow_template"."default_width" IS 'Default Width';
COMMENT ON COLUMN "workflow_template"."default_height" IS 'Default Height';
COMMENT ON COLUMN "workflow_template"."default_duration_min" IS 'Default Duration minimum';
COMMENT ON COLUMN "workflow_template"."default_worker_count" IS 'Default Worker Count';
COMMENT ON COLUMN "workflow_template"."default_temperature_c" IS 'Default Temperature C';
COMMENT ON COLUMN "workflow_template"."default_pressure_kpa" IS 'Default Pressure kPa';
COMMENT ON COLUMN "workflow_template"."default_energy_kwh" IS 'Default Energy kWh';
COMMENT ON COLUMN "workflow_template"."default_water_liter" IS 'Default Water Liter';
COMMENT ON COLUMN "workflow_template"."default_desc" IS 'Default description';
COMMENT ON COLUMN "workflow_template"."default_config" IS 'Default Config';
COMMENT ON COLUMN "workflow_template"."public_yn" IS 'Public flag (Y/N)';
COMMENT ON COLUMN "workflow_template"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "workflow_template"."created_by" IS 'Created BY';
COMMENT ON COLUMN "workflow_template"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "workflow_template"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "process"."process_id" IS 'Process ID';
COMMENT ON COLUMN "process"."project_id" IS 'Project ID';
COMMENT ON COLUMN "process"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "process"."template_id" IS 'Template ID';
COMMENT ON COLUMN "process"."process_code" IS 'Process Code';
COMMENT ON COLUMN "process"."process_name" IS 'Process Name';
COMMENT ON COLUMN "process"."process_type" IS 'Process Type';
COMMENT ON COLUMN "process"."node_type" IS 'Node Type';
COMMENT ON COLUMN "process"."parent_process_id" IS 'Parent Process ID';
COMMENT ON COLUMN "process"."equipment_id" IS 'Equipment ID';
COMMENT ON COLUMN "process"."process_status" IS 'Process Status';
COMMENT ON COLUMN "process"."lane" IS 'Lane';
COMMENT ON COLUMN "process"."pos_x" IS 'Pos X';
COMMENT ON COLUMN "process"."pos_y" IS 'Pos Y';
COMMENT ON COLUMN "process"."width" IS 'Width';
COMMENT ON COLUMN "process"."height" IS 'Height';
COMMENT ON COLUMN "process"."rotation" IS 'Rotation';
COMMENT ON COLUMN "process"."z_index" IS 'Z Index';
COMMENT ON COLUMN "process"."locked_yn" IS 'Locked flag (Y/N)';
COMMENT ON COLUMN "process"."process_desc" IS 'Process description';
COMMENT ON COLUMN "process"."worker_count" IS 'Worker Count';
COMMENT ON COLUMN "process"."duration_min" IS 'Duration minimum';
COMMENT ON COLUMN "process"."cycle_time_sec" IS 'Cycle Time Sec';
COMMENT ON COLUMN "process"."setup_time_min" IS 'Setup Time minimum';
COMMENT ON COLUMN "process"."wait_time_min" IS 'Wait Time minimum';
COMMENT ON COLUMN "process"."batch_size" IS 'Batch Size';
COMMENT ON COLUMN "process"."batch_unit" IS 'Batch Unit';
COMMENT ON COLUMN "process"."capacity_per_hour" IS 'Capacity Per Hour';
COMMENT ON COLUMN "process"."min_capacity" IS 'minimum Capacity';
COMMENT ON COLUMN "process"."max_capacity" IS 'maximum Capacity';
COMMENT ON COLUMN "process"."temperature_c" IS 'Temperature C';
COMMENT ON COLUMN "process"."pressure_kpa" IS 'Pressure kPa';
COMMENT ON COLUMN "process"."humidity_pct" IS 'Humidity Pct';
COMMENT ON COLUMN "process"."energy_kwh" IS 'Energy kWh';
COMMENT ON COLUMN "process"."water_liter" IS 'Water Liter';
COMMENT ON COLUMN "process"."cost_per_run" IS 'Cost Per Run';
COMMENT ON COLUMN "process"."yield_rate" IS 'Yield Rate';
COMMENT ON COLUMN "process"."availability_rate" IS 'Availability Rate';
COMMENT ON COLUMN "process"."changeover_time_min" IS 'Changeover Time minimum';
COMMENT ON COLUMN "process"."changeover_cost" IS 'Changeover Cost';
COMMENT ON COLUMN "process"."input_policy" IS 'Input Policy';
COMMENT ON COLUMN "process"."output_policy" IS 'Output Policy';
COMMENT ON COLUMN "process"."quality_check_yn" IS 'Quality Check flag (Y/N)';
COMMENT ON COLUMN "process"."inspection_standard" IS 'Inspection Standard';
COMMENT ON COLUMN "process"."icon_key" IS 'Icon Key';
COMMENT ON COLUMN "process"."color_scheme" IS 'Color Scheme';
COMMENT ON COLUMN "process"."metadata" IS 'Metadata';
COMMENT ON COLUMN "process"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "process"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "process"."created_by" IS 'Created BY';
COMMENT ON COLUMN "process"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "process"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "process"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "process"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "process_io"."process_io_id" IS 'Process I/O ID';
COMMENT ON COLUMN "process_io"."process_id" IS 'Process ID';
COMMENT ON COLUMN "process_io"."item_id" IS 'Item ID';
COMMENT ON COLUMN "process_io"."io_name" IS 'I/O Name';
COMMENT ON COLUMN "process_io"."direction" IS 'Direction';
COMMENT ON COLUMN "process_io"."io_type" IS 'I/O Type';
COMMENT ON COLUMN "process_io"."port_key" IS 'Port Key';
COMMENT ON COLUMN "process_io"."source_type" IS 'Source Type';
COMMENT ON COLUMN "process_io"."target_type" IS 'Target Type';
COMMENT ON COLUMN "process_io"."quantity" IS 'Quantity';
COMMENT ON COLUMN "process_io"."unit" IS 'Unit';
COMMENT ON COLUMN "process_io"."quantity_basis" IS 'Quantity Basis';
COMMENT ON COLUMN "process_io"."formula" IS 'Formula';
COMMENT ON COLUMN "process_io"."min_quantity" IS 'minimum quantity';
COMMENT ON COLUMN "process_io"."max_quantity" IS 'maximum quantity';
COMMENT ON COLUMN "process_io"."loss_rate" IS 'Loss Rate';
COMMENT ON COLUMN "process_io"."required_yn" IS 'Required flag (Y/N)';
COMMENT ON COLUMN "process_io"."allow_shortage_yn" IS 'Allow Shortage flag (Y/N)';
COMMENT ON COLUMN "process_io"."consume_timing" IS 'Consume Timing';
COMMENT ON COLUMN "process_io"."produce_timing" IS 'Produce Timing';
COMMENT ON COLUMN "process_io"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "process_io"."created_by" IS 'Created BY';
COMMENT ON COLUMN "process_io"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "process_io"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "process_io"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "process_io"."batch_size" IS 'Batch Size';
COMMENT ON COLUMN "process_io"."batch_unit" IS 'Batch Unit';
COMMENT ON COLUMN "process_io"."capacity_per_hour" IS 'Capacity Per Hour';
COMMENT ON COLUMN "process_io"."min_capacity" IS 'minimum Capacity';
COMMENT ON COLUMN "process_io"."max_capacity" IS 'maximum Capacity';
COMMENT ON COLUMN "process_io"."temperature_c" IS 'Temperature C';
COMMENT ON COLUMN "process_io"."pressure_kpa" IS 'Pressure kPa';
COMMENT ON COLUMN "process_io"."humidity_pct" IS 'Humidity Pct';
COMMENT ON COLUMN "process_io"."energy_kwh" IS 'Energy kWh';
COMMENT ON COLUMN "process_io"."water_liter" IS 'Water Liter';
COMMENT ON COLUMN "process_io"."cost_per_run" IS 'Cost Per Run';
COMMENT ON COLUMN "process_io"."yield_rate" IS 'Yield Rate';
COMMENT ON COLUMN "process_io"."availability_rate" IS 'Availability Rate';
COMMENT ON COLUMN "process_io"."changeover_time_min" IS 'Changeover Time minimum';
COMMENT ON COLUMN "process_io"."changeover_cost" IS 'Changeover Cost';
COMMENT ON COLUMN "process_io"."input_policy" IS 'Input Policy';
COMMENT ON COLUMN "process_io"."output_policy" IS 'Output Policy';
COMMENT ON COLUMN "process_io"."quality_check_yn" IS 'Quality Check flag (Y/N)';
COMMENT ON COLUMN "process_io"."inspection_standard" IS 'Inspection Standard';
COMMENT ON COLUMN "process_io"."icon_key" IS 'Icon Key';
COMMENT ON COLUMN "process_io"."color_scheme" IS 'Color Scheme';
COMMENT ON COLUMN "process_io"."metadata" IS 'Metadata';
COMMENT ON COLUMN "process_io"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "process_io"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "process_connection"."connection_id" IS 'Connection ID';
COMMENT ON COLUMN "process_connection"."project_id" IS 'Project ID';
COMMENT ON COLUMN "process_connection"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "process_connection"."from_process_id" IS 'From Process ID';
COMMENT ON COLUMN "process_connection"."to_process_id" IS 'TO Process ID';
COMMENT ON COLUMN "process_connection"."from_io_id" IS 'From I/O ID';
COMMENT ON COLUMN "process_connection"."to_io_id" IS 'TO I/O ID';
COMMENT ON COLUMN "process_connection"."item_id" IS 'Item ID';
COMMENT ON COLUMN "process_connection"."source_handle" IS 'Source Handle';
COMMENT ON COLUMN "process_connection"."target_handle" IS 'Target Handle';
COMMENT ON COLUMN "process_connection"."line_type" IS 'Line Type';
COMMENT ON COLUMN "process_connection"."connection_type" IS 'Connection Type';
COMMENT ON COLUMN "process_connection"."flow_direction" IS 'Flow Direction';
COMMENT ON COLUMN "process_connection"."connection_label" IS 'Connection Label';
COMMENT ON COLUMN "process_connection"."flow_rate" IS 'Flow Rate';
COMMENT ON COLUMN "process_connection"."min_flow_rate" IS 'minimum Flow Rate';
COMMENT ON COLUMN "process_connection"."max_flow_rate" IS 'maximum Flow Rate';
COMMENT ON COLUMN "process_connection"."unit" IS 'Unit';
COMMENT ON COLUMN "process_connection"."delay_time_sec" IS 'Delay Time Sec';
COMMENT ON COLUMN "process_connection"."distance_meter" IS 'Distance Meter';
COMMENT ON COLUMN "process_connection"."loss_rate" IS 'Loss Rate';
COMMENT ON COLUMN "process_connection"."priority" IS 'Priority';
COMMENT ON COLUMN "process_connection"."waypoints" IS 'Waypoints';
COMMENT ON COLUMN "process_connection"."style" IS 'Style';
COMMENT ON COLUMN "process_connection"."flow_condition" IS 'Flow Condition';
COMMENT ON COLUMN "process_connection"."animated_yn" IS 'Animated flag (Y/N)';
COMMENT ON COLUMN "process_connection"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "process_connection"."metadata" IS 'Metadata';
COMMENT ON COLUMN "process_connection"."created_by" IS 'Created BY';
COMMENT ON COLUMN "process_connection"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "process_connection"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "process_connection"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "process_connection"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "item"."item_id" IS 'Resource ID';
COMMENT ON COLUMN "item"."project_id" IS 'Project ID';
COMMENT ON COLUMN "item"."item_code" IS 'Item Code';
COMMENT ON COLUMN "item"."item_name" IS 'Item Name';
COMMENT ON COLUMN "item"."item_type" IS 'Item Type';
COMMENT ON COLUMN "item"."item_category" IS 'Item Category';
COMMENT ON COLUMN "item"."resource_category" IS 'Resource Category';
COMMENT ON COLUMN "item"."resource_type" IS 'Resource Type';
COMMENT ON COLUMN "item"."domain_resource_type_id" IS 'Domain Resource Type ID';
COMMENT ON COLUMN "item"."item_group" IS 'Item Group';
COMMENT ON COLUMN "item"."item_status" IS 'Item Status';
COMMENT ON COLUMN "item"."unit" IS 'Unit';
COMMENT ON COLUMN "item"."unit_id" IS 'Unit ID';
COMMENT ON COLUMN "item"."purchase_unit" IS 'Purchase Unit';
COMMENT ON COLUMN "item"."production_unit" IS 'Production Unit';
COMMENT ON COLUMN "item"."conversion_rate" IS 'Conversion Rate';
COMMENT ON COLUMN "item"."unit_cost" IS 'Unit Cost';
COMMENT ON COLUMN "item"."cost_calc_type" IS 'Cost Calc Type';
COMMENT ON COLUMN "item"."spec" IS 'Spec';
COMMENT ON COLUMN "item"."spec_json" IS 'Spec JSON';
COMMENT ON COLUMN "item"."barcode" IS 'Barcode';
COMMENT ON COLUMN "item"."sku" IS 'SKU';
COMMENT ON COLUMN "item"."item_desc" IS 'Item description';
COMMENT ON COLUMN "item"."stock_managed_yn" IS 'Stock Managed flag (Y/N)';
COMMENT ON COLUMN "item"."metered_yn" IS 'Metered flag (Y/N)';
COMMENT ON COLUMN "item"."consumable_yn" IS 'Consumable flag (Y/N)';
COMMENT ON COLUMN "item"."reusable_yn" IS 'Reusable flag (Y/N)';
COMMENT ON COLUMN "item"."physical_yn" IS 'Physical flag (Y/N)';
COMMENT ON COLUMN "item"."digital_yn" IS 'Digital flag (Y/N)';
COMMENT ON COLUMN "item"."stateful_yn" IS 'Stateful flag (Y/N)';
COMMENT ON COLUMN "item"."safety_stock_qty" IS 'Safety Stock quantity';
COMMENT ON COLUMN "item"."lead_time_days" IS 'Lead Time Days';
COMMENT ON COLUMN "item"."storage_condition" IS 'Storage Condition';
COMMENT ON COLUMN "item"."expiry_manage_yn" IS 'Expiry Manage flag (Y/N)';
COMMENT ON COLUMN "item"."lot_manage_yn" IS 'Lot Manage flag (Y/N)';
COMMENT ON COLUMN "item"."serial_manage_yn" IS 'Serial Manage flag (Y/N)';
COMMENT ON COLUMN "item"."allergen_info" IS 'Allergen Info';
COMMENT ON COLUMN "item"."hazard_info" IS 'Hazard Info';
COMMENT ON COLUMN "item"."metadata" IS 'Metadata';
COMMENT ON COLUMN "item"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "item"."created_by" IS 'Created BY';
COMMENT ON COLUMN "item"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "item"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "item"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "item"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "unit_master"."unit_id" IS 'Unit ID';
COMMENT ON COLUMN "unit_master"."unit_code" IS 'Unit Code';
COMMENT ON COLUMN "unit_master"."unit_name" IS 'Unit Name';
COMMENT ON COLUMN "unit_master"."unit_type" IS 'Unit Type';
COMMENT ON COLUMN "unit_master"."base_unit_code" IS 'Base Unit Code';
COMMENT ON COLUMN "unit_master"."conversion_rate" IS 'Conversion Rate';
COMMENT ON COLUMN "unit_master"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "unit_master"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "unit_master"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "inventory"."inventory_id" IS 'Inventory ID';
COMMENT ON COLUMN "inventory"."project_id" IS 'Project ID';
COMMENT ON COLUMN "inventory"."item_id" IS 'Item ID';
COMMENT ON COLUMN "inventory"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "inventory"."quantity" IS 'Quantity';
COMMENT ON COLUMN "inventory"."reserved_quantity" IS 'Reserved quantity';
COMMENT ON COLUMN "inventory"."available_quantity" IS 'Available quantity';
COMMENT ON COLUMN "inventory"."inbound_expected_qty" IS 'Inbound Expected quantity';
COMMENT ON COLUMN "inventory"."outbound_expected_qty" IS 'Outbound Expected quantity';
COMMENT ON COLUMN "inventory"."min_threshold" IS 'minimum Threshold';
COMMENT ON COLUMN "inventory"."max_threshold" IS 'maximum Threshold';
COMMENT ON COLUMN "inventory"."inventory_status" IS 'Inventory Status';
COMMENT ON COLUMN "inventory"."location" IS 'Location';
COMMENT ON COLUMN "inventory"."warehouse_code" IS 'Warehouse Code';
COMMENT ON COLUMN "inventory"."zone" IS 'Zone';
COMMENT ON COLUMN "inventory"."lot_no" IS 'Lot number';
COMMENT ON COLUMN "inventory"."expiry_date" IS 'Expiry Date';
COMMENT ON COLUMN "inventory"."locked_yn" IS 'Locked flag (Y/N)';
COMMENT ON COLUMN "inventory"."last_checked_at" IS 'Last Checked timestamp';
COMMENT ON COLUMN "inventory"."last_checked_by" IS 'Last Checked BY';
COMMENT ON COLUMN "inventory"."created_by" IS 'Created BY';
COMMENT ON COLUMN "inventory"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "inventory"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "inventory"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "inventory"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "inventory_transaction"."inventory_transaction_id" IS 'Inventory transaction ID';
COMMENT ON COLUMN "inventory_transaction"."inventory_id" IS 'Inventory ID';
COMMENT ON COLUMN "inventory_transaction"."project_id" IS 'Project ID';
COMMENT ON COLUMN "inventory_transaction"."item_id" IS 'Item ID';
COMMENT ON COLUMN "inventory_transaction"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "inventory_transaction"."transaction_type" IS 'Transaction type';
COMMENT ON COLUMN "inventory_transaction"."quantity_delta" IS 'Quantity delta';
COMMENT ON COLUMN "inventory_transaction"."reserved_delta" IS 'Reserved quantity delta';
COMMENT ON COLUMN "inventory_transaction"."available_delta" IS 'Available quantity delta';
COMMENT ON COLUMN "inventory_transaction"."quantity_after" IS 'Quantity after transaction';
COMMENT ON COLUMN "inventory_transaction"."reserved_after" IS 'Reserved quantity after transaction';
COMMENT ON COLUMN "inventory_transaction"."available_after" IS 'Available quantity after transaction';
COMMENT ON COLUMN "inventory_transaction"."reference_type" IS 'Reference type';
COMMENT ON COLUMN "inventory_transaction"."reference_id" IS 'Reference ID';
COMMENT ON COLUMN "inventory_transaction"."note" IS 'Note';
COMMENT ON COLUMN "inventory_transaction"."created_by" IS 'Created by';
COMMENT ON COLUMN "inventory_transaction"."created_at" IS 'Created at';
COMMENT ON COLUMN "flow_rule"."rule_id" IS 'Flow rule ID';
COMMENT ON COLUMN "flow_rule"."project_id" IS 'Project ID';
COMMENT ON COLUMN "flow_rule"."target_type" IS 'Target type';
COMMENT ON COLUMN "flow_rule"."target_id" IS 'Target ID';
COMMENT ON COLUMN "flow_rule"."rule_name" IS 'Rule name';
COMMENT ON COLUMN "flow_rule"."rule_desc" IS 'Rule description';
COMMENT ON COLUMN "flow_rule"."condition_type" IS 'Condition type';
COMMENT ON COLUMN "flow_rule"."condition_expression" IS 'Condition expression';
COMMENT ON COLUMN "flow_rule"."action_type" IS 'Action type';
COMMENT ON COLUMN "flow_rule"."action_config" IS 'Action config JSON';
COMMENT ON COLUMN "flow_rule"."priority" IS 'Rule priority';
COMMENT ON COLUMN "flow_rule"."enabled_yn" IS 'Enabled flag (Y/N)';
COMMENT ON COLUMN "bom_header"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "bom_header"."project_id" IS 'Project ID';
COMMENT ON COLUMN "bom_header"."target_item_id" IS 'Target Item ID';
COMMENT ON COLUMN "bom_header"."bom_name" IS 'BOM Name';
COMMENT ON COLUMN "bom_header"."bom_version" IS 'BOM Version';
COMMENT ON COLUMN "bom_header"."base_quantity" IS 'Base quantity';
COMMENT ON COLUMN "bom_header"."base_unit" IS 'Base Unit';
COMMENT ON COLUMN "bom_header"."output_quantity" IS 'Output quantity';
COMMENT ON COLUMN "bom_header"."bom_status" IS 'BOM Status';
COMMENT ON COLUMN "bom_header"."approval_status" IS 'Approval Status';
COMMENT ON COLUMN "bom_header"."approved_by" IS 'Approved BY';
COMMENT ON COLUMN "bom_header"."approved_at" IS 'Approved timestamp';
COMMENT ON COLUMN "bom_header"."active_yn" IS 'Active flag (Y/N)';
COMMENT ON COLUMN "bom_header"."effective_from" IS 'Effective From';
COMMENT ON COLUMN "bom_header"."effective_to" IS 'Effective TO';
COMMENT ON COLUMN "bom_header"."note" IS 'Note';
COMMENT ON COLUMN "bom_header"."created_by" IS 'Created BY';
COMMENT ON COLUMN "bom_header"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "bom_header"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "bom_header"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "bom_header"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "bom_line"."bom_line_id" IS 'BOM Line ID';
COMMENT ON COLUMN "bom_line"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "bom_line"."child_item_id" IS 'Child Item ID';
COMMENT ON COLUMN "bom_line"."line_type" IS 'Line Type';
COMMENT ON COLUMN "bom_line"."quantity" IS 'Quantity';
COMMENT ON COLUMN "bom_line"."unit" IS 'Unit';
COMMENT ON COLUMN "bom_line"."scrap_rate" IS 'Scrap Rate';
COMMENT ON COLUMN "bom_line"."optional_yn" IS 'Optional flag (Y/N)';
COMMENT ON COLUMN "bom_line"."substitute_group" IS 'Substitute Group';
COMMENT ON COLUMN "bom_line"."priority" IS 'Priority';
COMMENT ON COLUMN "bom_line"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "bom_line"."note" IS 'Note';
COMMENT ON COLUMN "bom_line"."created_by" IS 'Created BY';
COMMENT ON COLUMN "bom_line"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "bom_line"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "equipment"."equipment_id" IS 'Equipment ID';
COMMENT ON COLUMN "equipment"."project_id" IS 'Project ID';
COMMENT ON COLUMN "equipment"."equipment_code" IS 'Equipment Code';
COMMENT ON COLUMN "equipment"."equipment_name" IS 'Equipment Name';
COMMENT ON COLUMN "equipment"."equipment_type" IS 'Equipment Type';
COMMENT ON COLUMN "equipment"."manufacturer" IS 'Manufacturer';
COMMENT ON COLUMN "equipment"."model_name" IS 'Model Name';
COMMENT ON COLUMN "equipment"."serial_no" IS 'Serial number';
COMMENT ON COLUMN "equipment"."capacity_per_hour" IS 'Capacity Per Hour';
COMMENT ON COLUMN "equipment"."power_kwh" IS 'Power kWh';
COMMENT ON COLUMN "equipment"."water_liter" IS 'Water Liter';
COMMENT ON COLUMN "equipment"."equipment_status" IS 'Equipment Status';
COMMENT ON COLUMN "equipment"."location" IS 'Location';
COMMENT ON COLUMN "equipment"."created_by" IS 'Created BY';
COMMENT ON COLUMN "equipment"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "equipment"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "equipment"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "equipment"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "work_order"."work_order_id" IS 'Work Order ID';
COMMENT ON COLUMN "work_order"."project_id" IS 'Project ID';
COMMENT ON COLUMN "work_order"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "work_order"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "work_order"."work_order_number" IS 'Work Order Number';
COMMENT ON COLUMN "work_order"."work_order_title" IS 'Work Order Title';
COMMENT ON COLUMN "work_order"."work_order_status" IS 'Work Order Status';
COMMENT ON COLUMN "work_order"."priority" IS 'Priority';
COMMENT ON COLUMN "work_order"."target_item_id" IS 'Target Item ID';
COMMENT ON COLUMN "work_order"."target_quantity" IS 'Target quantity';
COMMENT ON COLUMN "work_order"."planned_start_at" IS 'Planned Start timestamp';
COMMENT ON COLUMN "work_order"."planned_end_at" IS 'Planned End timestamp';
COMMENT ON COLUMN "work_order"."actual_start_at" IS 'Actual Start timestamp';
COMMENT ON COLUMN "work_order"."actual_end_at" IS 'Actual End timestamp';
COMMENT ON COLUMN "work_order"."instruction" IS 'Instruction';
COMMENT ON COLUMN "work_order"."pdf_url" IS 'PDF URL';
COMMENT ON COLUMN "work_order"."assigned_to" IS 'Assigned TO';
COMMENT ON COLUMN "work_order"."issued_by" IS 'Issued BY';
COMMENT ON COLUMN "work_order"."issued_at" IS 'Issued timestamp';
COMMENT ON COLUMN "work_order"."approved_by" IS 'Approved BY';
COMMENT ON COLUMN "work_order"."approved_at" IS 'Approved timestamp';
COMMENT ON COLUMN "work_order"."created_by" IS 'Created BY';
COMMENT ON COLUMN "work_order"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "work_order"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "work_order"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "work_order"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "work_order_item"."work_order_item_id" IS 'Work Order Item ID';
COMMENT ON COLUMN "work_order_item"."work_order_id" IS 'Work Order ID';
COMMENT ON COLUMN "work_order_item"."item_id" IS 'Item ID';
COMMENT ON COLUMN "work_order_item"."process_id" IS 'Process ID';
COMMENT ON COLUMN "work_order_item"."bom_line_id" IS 'BOM Line ID';
COMMENT ON COLUMN "work_order_item"."direction" IS 'Direction';
COMMENT ON COLUMN "work_order_item"."required_qty" IS 'Required quantity';
COMMENT ON COLUMN "work_order_item"."planned_qty" IS 'Planned quantity';
COMMENT ON COLUMN "work_order_item"."actual_qty" IS 'Actual quantity';
COMMENT ON COLUMN "work_order_item"."unit" IS 'Unit';
COMMENT ON COLUMN "work_order_item"."item_status" IS 'Item Status';
COMMENT ON COLUMN "work_order_item"."note" IS 'Note';
COMMENT ON COLUMN "work_order_item"."sort_order" IS 'Sort Order';
COMMENT ON COLUMN "production_run"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "production_run"."project_id" IS 'Project ID';
COMMENT ON COLUMN "production_run"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "production_run"."work_order_id" IS 'Work Order ID';
COMMENT ON COLUMN "production_run"."bom_id" IS 'BOM ID';
COMMENT ON COLUMN "production_run"."bom_version" IS 'BOM Version';
COMMENT ON COLUMN "production_run"."run_number" IS 'Run Number';
COMMENT ON COLUMN "production_run"."run_type" IS 'Run Type';
COMMENT ON COLUMN "production_run"."run_status" IS 'Run Status';
COMMENT ON COLUMN "production_run"."target_item_id" IS 'Target Item ID';
COMMENT ON COLUMN "production_run"."planned_output_qty" IS 'Planned Output quantity';
COMMENT ON COLUMN "production_run"."actual_output_qty" IS 'Actual Output quantity';
COMMENT ON COLUMN "production_run"."good_qty" IS 'Good quantity';
COMMENT ON COLUMN "production_run"."defect_qty" IS 'Defect quantity';
COMMENT ON COLUMN "production_run"."yield_rate" IS 'Yield Rate';
COMMENT ON COLUMN "production_run"."planned_start_at" IS 'Planned Start timestamp';
COMMENT ON COLUMN "production_run"."planned_end_at" IS 'Planned End timestamp';
COMMENT ON COLUMN "production_run"."actual_start_at" IS 'Actual Start timestamp';
COMMENT ON COLUMN "production_run"."actual_end_at" IS 'Actual End timestamp';
COMMENT ON COLUMN "production_run"."planned_duration_min" IS 'Planned Duration minimum';
COMMENT ON COLUMN "production_run"."simulation_config" IS 'Simulation Config';
COMMENT ON COLUMN "production_run"."simulation_result" IS 'Simulation Result';
COMMENT ON COLUMN "production_run"."bottleneck_process_id" IS 'Bottleneck Process ID';
COMMENT ON COLUMN "production_run"."total_material_cost" IS 'Total Material Cost';
COMMENT ON COLUMN "production_run"."total_energy_cost" IS 'Total Energy Cost';
COMMENT ON COLUMN "production_run"."total_labor_cost" IS 'Total Labor Cost';
COMMENT ON COLUMN "production_run"."total_cost" IS 'Total Cost';
COMMENT ON COLUMN "production_run"."cost_per_unit" IS 'Cost Per Unit';
COMMENT ON COLUMN "production_run"."note" IS 'Note';
COMMENT ON COLUMN "production_run"."started_by" IS 'Started BY';
COMMENT ON COLUMN "production_run"."finished_by" IS 'Finished BY';
COMMENT ON COLUMN "production_run"."created_by" IS 'Created BY';
COMMENT ON COLUMN "production_run"."updated_by" IS 'Updated BY';
COMMENT ON COLUMN "production_run"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "production_run"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "production_run_item"."production_run_item_id" IS 'Production Run Item ID';
COMMENT ON COLUMN "production_run_item"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "production_run_item"."process_id" IS 'Process ID';
COMMENT ON COLUMN "production_run_item"."process_io_id" IS 'Process I/O ID';
COMMENT ON COLUMN "production_run_item"."inventory_id" IS 'Inventory ID';
COMMENT ON COLUMN "production_run_item"."item_id" IS 'Item ID';
COMMENT ON COLUMN "production_run_item"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "production_run_item"."direction" IS 'Direction';
COMMENT ON COLUMN "production_run_item"."planned_qty" IS 'Planned quantity';
COMMENT ON COLUMN "production_run_item"."actual_qty" IS 'Actual quantity';
COMMENT ON COLUMN "production_run_item"."variance_qty" IS 'Variance quantity';
COMMENT ON COLUMN "production_run_item"."loss_qty" IS 'Loss quantity';
COMMENT ON COLUMN "production_run_item"."unit" IS 'Unit';
COMMENT ON COLUMN "production_run_item"."unit_cost_snapshot" IS 'Unit Cost Snapshot';
COMMENT ON COLUMN "production_run_item"."lot_no" IS 'Lot number';
COMMENT ON COLUMN "production_run_item"."quantity_source" IS 'Quantity Source';
COMMENT ON COLUMN "production_run_item"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "stock_alert"."stock_alert_id" IS 'Stock Alert ID';
COMMENT ON COLUMN "stock_alert"."project_id" IS 'Project ID';
COMMENT ON COLUMN "stock_alert"."inventory_id" IS 'Inventory ID';
COMMENT ON COLUMN "stock_alert"."item_id" IS 'Item ID';
COMMENT ON COLUMN "stock_alert"."alert_type" IS 'Alert Type';
COMMENT ON COLUMN "stock_alert"."severity" IS 'Severity';
COMMENT ON COLUMN "stock_alert"."threshold_value" IS 'Threshold Value';
COMMENT ON COLUMN "stock_alert"."actual_value" IS 'Actual Value';
COMMENT ON COLUMN "stock_alert"."alert_message" IS 'Alert Message';
COMMENT ON COLUMN "stock_alert"."resolved_yn" IS 'Resolved flag (Y/N)';
COMMENT ON COLUMN "stock_alert"."resolved_at" IS 'Resolved timestamp';
COMMENT ON COLUMN "stock_alert"."resolved_by" IS 'Resolved BY';
COMMENT ON COLUMN "stock_alert"."triggered_at" IS 'Triggered timestamp';
COMMENT ON COLUMN "stock_alert"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "defect_log"."defect_log_id" IS 'Defect Log ID';
COMMENT ON COLUMN "defect_log"."project_id" IS 'Project ID';
COMMENT ON COLUMN "defect_log"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "defect_log"."process_id" IS 'Process ID';
COMMENT ON COLUMN "defect_log"."item_id" IS 'Item ID';
COMMENT ON COLUMN "defect_log"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "defect_log"."inspection_id" IS 'Inspection ID';
COMMENT ON COLUMN "defect_log"."defect_code" IS 'Defect Code';
COMMENT ON COLUMN "defect_log"."defect_type" IS 'Defect Type';
COMMENT ON COLUMN "defect_log"."defect_location" IS 'Defect Location';
COMMENT ON COLUMN "defect_log"."quantity" IS 'Quantity';
COMMENT ON COLUMN "defect_log"."severity" IS 'Severity';
COMMENT ON COLUMN "defect_log"."reason" IS 'Reason';
COMMENT ON COLUMN "defect_log"."action_taken" IS 'Action Taken';
COMMENT ON COLUMN "defect_log"."image_url" IS 'Image URL';
COMMENT ON COLUMN "defect_log"."resolved_yn" IS 'Resolved flag (Y/N)';
COMMENT ON COLUMN "defect_log"."resolved_at" IS 'Resolved timestamp';
COMMENT ON COLUMN "defect_log"."detected_at" IS 'Detected timestamp';
COMMENT ON COLUMN "defect_log"."logged_by" IS 'Logged BY';
COMMENT ON COLUMN "defect_log"."resolved_by" IS 'Resolved BY';
COMMENT ON COLUMN "defect_log"."logged_at" IS 'Logged timestamp';
COMMENT ON COLUMN "quality_inspection"."inspection_id" IS 'Inspection ID';
COMMENT ON COLUMN "quality_inspection"."project_id" IS 'Project ID';
COMMENT ON COLUMN "quality_inspection"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "quality_inspection"."process_id" IS 'Process ID';
COMMENT ON COLUMN "quality_inspection"."item_id" IS 'Item ID';
COMMENT ON COLUMN "quality_inspection"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "quality_inspection"."inspection_type" IS 'Inspection Type';
COMMENT ON COLUMN "quality_inspection"."result_status" IS 'Result Status';
COMMENT ON COLUMN "quality_inspection"."measured_value" IS 'Measured Value';
COMMENT ON COLUMN "quality_inspection"."standard_min" IS 'Standard minimum';
COMMENT ON COLUMN "quality_inspection"."standard_max" IS 'Standard maximum';
COMMENT ON COLUMN "quality_inspection"."unit" IS 'Unit';
COMMENT ON COLUMN "quality_inspection"."note" IS 'Note';
COMMENT ON COLUMN "quality_inspection"."inspected_by" IS 'Inspected BY';
COMMENT ON COLUMN "quality_inspection"."inspected_at" IS 'Inspected timestamp';
COMMENT ON COLUMN "lot_master"."lot_id" IS 'Lot ID';
COMMENT ON COLUMN "lot_master"."project_id" IS 'Project ID';
COMMENT ON COLUMN "lot_master"."item_id" IS 'Item ID';
COMMENT ON COLUMN "lot_master"."inventory_id" IS 'Inventory ID';
COMMENT ON COLUMN "lot_master"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "lot_master"."lot_no" IS 'Lot number';
COMMENT ON COLUMN "lot_master"."serial_no" IS 'Serial number';
COMMENT ON COLUMN "lot_master"."produced_at" IS 'Produced timestamp';
COMMENT ON COLUMN "lot_master"."received_at" IS 'Received timestamp';
COMMENT ON COLUMN "lot_master"."expiry_date" IS 'Expiry Date';
COMMENT ON COLUMN "lot_master"."lot_status" IS 'Lot Status';
COMMENT ON COLUMN "lot_master"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "lot_master"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "lot_trace"."lot_trace_id" IS 'Lot Trace ID';
COMMENT ON COLUMN "lot_trace"."project_id" IS 'Project ID';
COMMENT ON COLUMN "lot_trace"."parent_lot_id" IS 'Parent Lot ID';
COMMENT ON COLUMN "lot_trace"."child_lot_id" IS 'Child Lot ID';
COMMENT ON COLUMN "lot_trace"."production_run_id" IS 'Production Run ID';
COMMENT ON COLUMN "lot_trace"."process_id" IS 'Process ID';
COMMENT ON COLUMN "lot_trace"."consumed_qty" IS 'Consumed quantity';
COMMENT ON COLUMN "lot_trace"."produced_qty" IS 'Produced quantity';
COMMENT ON COLUMN "lot_trace"."unit" IS 'Unit';
COMMENT ON COLUMN "lot_trace"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_file"."project_file_id" IS 'Project File ID';
COMMENT ON COLUMN "project_file"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_file"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "project_file"."process_id" IS 'Process ID';
COMMENT ON COLUMN "project_file"."target_type" IS 'Target Type';
COMMENT ON COLUMN "project_file"."target_id" IS 'Target ID';
COMMENT ON COLUMN "project_file"."file_type" IS 'File Type';
COMMENT ON COLUMN "project_file"."original_filename" IS 'Original Filename';
COMMENT ON COLUMN "project_file"."stored_filename" IS 'Stored Filename';
COMMENT ON COLUMN "project_file"."file_url" IS 'File URL';
COMMENT ON COLUMN "project_file"."mime_type" IS 'Mime Type';
COMMENT ON COLUMN "project_file"."file_size" IS 'File Size';
COMMENT ON COLUMN "project_file"."file_desc" IS 'File description';
COMMENT ON COLUMN "project_file"."file_status" IS 'File Status';
COMMENT ON COLUMN "project_file"."version_no" IS 'Version number';
COMMENT ON COLUMN "project_file"."checksum" IS 'Checksum';
COMMENT ON COLUMN "project_file"."uploaded_by" IS 'Uploaded BY';
COMMENT ON COLUMN "project_file"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_file"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "project_export"."export_id" IS 'Export ID';
COMMENT ON COLUMN "project_export"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_export"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "project_export"."export_type" IS 'Export Type';
COMMENT ON COLUMN "project_export"."file_url" IS 'File URL';
COMMENT ON COLUMN "project_export"."canvas_snapshot" IS 'Canvas Snapshot';
COMMENT ON COLUMN "project_export"."export_option" IS 'Export Option';
COMMENT ON COLUMN "project_export"."created_by" IS 'Created BY';
COMMENT ON COLUMN "project_export"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "cad_import_job"."cad_job_id" IS 'CAD Job ID';
COMMENT ON COLUMN "cad_import_job"."project_id" IS 'Project ID';
COMMENT ON COLUMN "cad_import_job"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "cad_import_job"."job_type" IS 'Job Type';
COMMENT ON COLUMN "cad_import_job"."job_status" IS 'Job Status';
COMMENT ON COLUMN "cad_import_job"."source_file_id" IS 'Source File ID';
COMMENT ON COLUMN "cad_import_job"."result_file_url" IS 'Result File URL';
COMMENT ON COLUMN "cad_import_job"."result_message" IS 'Result Message';
COMMENT ON COLUMN "cad_import_job"."mapping_data" IS 'Mapping Data';
COMMENT ON COLUMN "cad_import_job"."import_option" IS 'Import Option';
COMMENT ON COLUMN "cad_import_job"."progress_rate" IS 'Progress Rate';
COMMENT ON COLUMN "cad_import_job"."error_code" IS 'Error Code';
COMMENT ON COLUMN "cad_import_job"."created_process_count" IS 'Created Process Count';
COMMENT ON COLUMN "cad_import_job"."created_connection_count" IS 'Created Connection Count';
COMMENT ON COLUMN "cad_import_job"."started_at" IS 'Started timestamp';
COMMENT ON COLUMN "cad_import_job"."finished_at" IS 'Finished timestamp';
COMMENT ON COLUMN "cad_import_job"."created_by" IS 'Created BY';
COMMENT ON COLUMN "cad_import_job"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "cad_import_job"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "simulation_run"."simulation_run_id" IS 'Simulation Run ID';
COMMENT ON COLUMN "simulation_run"."project_id" IS 'Project ID';
COMMENT ON COLUMN "simulation_run"."workflow_id" IS 'Workflow ID';
COMMENT ON COLUMN "simulation_run"."simulation_name" IS 'Simulation Name';
COMMENT ON COLUMN "simulation_run"."target_item_id" IS 'Target Item ID';
COMMENT ON COLUMN "simulation_run"."target_quantity" IS 'Target quantity';
COMMENT ON COLUMN "simulation_run"."simulation_status" IS 'Simulation Status';
COMMENT ON COLUMN "simulation_run"."input_snapshot" IS 'Input Snapshot';
COMMENT ON COLUMN "simulation_run"."result_summary" IS 'Result Summary';
COMMENT ON COLUMN "simulation_run"."bottleneck_process_id" IS 'Bottleneck Process ID';
COMMENT ON COLUMN "simulation_run"."total_duration_min" IS 'Total Duration minimum';
COMMENT ON COLUMN "simulation_run"."total_cost" IS 'Total Cost';
COMMENT ON COLUMN "simulation_run"."created_by" IS 'Created BY';
COMMENT ON COLUMN "simulation_run"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "simulation_run"."finished_at" IS 'Finished timestamp';
COMMENT ON COLUMN "simulation_step"."simulation_step_id" IS 'Simulation Step ID';
COMMENT ON COLUMN "simulation_step"."simulation_run_id" IS 'Simulation Run ID';
COMMENT ON COLUMN "simulation_step"."process_id" IS 'Process ID';
COMMENT ON COLUMN "simulation_step"."step_order" IS 'Step Order';
COMMENT ON COLUMN "simulation_step"."start_time_sec" IS 'Start Time Sec';
COMMENT ON COLUMN "simulation_step"."end_time_sec" IS 'End Time Sec';
COMMENT ON COLUMN "simulation_step"."input_data" IS 'Input Data';
COMMENT ON COLUMN "simulation_step"."output_data" IS 'Output Data';
COMMENT ON COLUMN "simulation_step"."waiting_time_sec" IS 'Waiting Time Sec';
COMMENT ON COLUMN "simulation_step"."cost" IS 'Cost';
COMMENT ON COLUMN "simulation_step"."result_message" IS 'Result Message';
COMMENT ON COLUMN "project_activity_log"."activity_id" IS 'Activity ID';
COMMENT ON COLUMN "project_activity_log"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_activity_log"."user_id" IS 'User ID';
COMMENT ON COLUMN "project_activity_log"."action_type" IS 'Action Type';
COMMENT ON COLUMN "project_activity_log"."target_type" IS 'Target Type';
COMMENT ON COLUMN "project_activity_log"."target_id" IS 'Target ID';
COMMENT ON COLUMN "project_activity_log"."before_data" IS 'Before Data';
COMMENT ON COLUMN "project_activity_log"."after_data" IS 'After Data';
COMMENT ON COLUMN "project_activity_log"."description" IS 'Description';
COMMENT ON COLUMN "project_activity_log"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_comment"."comment_id" IS 'Comment ID';
COMMENT ON COLUMN "project_comment"."project_id" IS 'Project ID';
COMMENT ON COLUMN "project_comment"."target_type" IS 'Target Type';
COMMENT ON COLUMN "project_comment"."target_id" IS 'Target ID';
COMMENT ON COLUMN "project_comment"."comment_body" IS 'Comment Body';
COMMENT ON COLUMN "project_comment"."parent_comment_id" IS 'Parent Comment ID';
COMMENT ON COLUMN "project_comment"."resolved_yn" IS 'Resolved flag (Y/N)';
COMMENT ON COLUMN "project_comment"."created_by" IS 'Created BY';
COMMENT ON COLUMN "project_comment"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "project_comment"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "project_comment"."deleted_yn" IS 'Deleted flag (Y/N)';
COMMENT ON COLUMN "plan"."id" IS 'ID';
COMMENT ON COLUMN "plan"."plan_code" IS 'Plan Code';
COMMENT ON COLUMN "plan"."plan_name" IS 'Plan Name';
COMMENT ON COLUMN "plan"."plan_desc" IS 'Plan description';
COMMENT ON COLUMN "plan"."max_users" IS 'maximum Users';
COMMENT ON COLUMN "plan"."max_factories" IS 'maximum Factories';
COMMENT ON COLUMN "plan"."plan_status" IS 'Plan Status';
COMMENT ON COLUMN "plan"."display_order" IS 'Display Order';
COMMENT ON COLUMN "plan"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "plan"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "plan_pricing"."plan_id" IS 'Plan ID';
COMMENT ON COLUMN "plan_pricing"."billing_months" IS 'Billing Months';
COMMENT ON COLUMN "plan_pricing"."unit_price" IS 'Unit Price';
COMMENT ON COLUMN "plan_pricing"."discount_rate" IS 'Discount Rate';
COMMENT ON COLUMN "plan_pricing"."total_price" IS 'Total Price';
COMMENT ON COLUMN "plan_pricing"."currency" IS 'Currency';
COMMENT ON COLUMN "plan_pricing"."is_active" IS 'IS Active';
COMMENT ON COLUMN "plan_pricing"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "plan_pricing"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "subscription"."user_id" IS 'User ID';
COMMENT ON COLUMN "subscription"."plan_id" IS 'Plan ID';
COMMENT ON COLUMN "subscription"."plan_pricing_id" IS 'Plan Pricing ID';
COMMENT ON COLUMN "subscription"."billing_type" IS 'Billing Type';
COMMENT ON COLUMN "subscription"."status" IS 'Status';
COMMENT ON COLUMN "subscription"."started_at" IS 'Started timestamp';
COMMENT ON COLUMN "subscription"."expired_at" IS 'Expired timestamp';
COMMENT ON COLUMN "subscription"."next_billing_at" IS 'Next Billing timestamp';
COMMENT ON COLUMN "subscription"."auto_renew" IS 'Auto Renew';
COMMENT ON COLUMN "subscription"."cancelled_at" IS 'Cancelled timestamp';
COMMENT ON COLUMN "subscription"."cancel_reason" IS 'Cancel Reason';
COMMENT ON COLUMN "subscription"."trial_ends_at" IS 'Trial Ends timestamp';
COMMENT ON COLUMN "subscription"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "subscription"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "payment"."user_id" IS 'User ID';
COMMENT ON COLUMN "payment"."subscription_id" IS 'Subscription ID';
COMMENT ON COLUMN "payment"."plan_pricing_id" IS 'Plan Pricing ID';
COMMENT ON COLUMN "payment"."coupon_id" IS 'Coupon ID';
COMMENT ON COLUMN "payment"."promotion_id" IS 'Promotion ID';
COMMENT ON COLUMN "payment"."original_amount" IS 'Original Amount';
COMMENT ON COLUMN "payment"."discount_amount" IS 'Discount Amount';
COMMENT ON COLUMN "payment"."final_amount" IS 'Final Amount';
COMMENT ON COLUMN "payment"."currency" IS 'Currency';
COMMENT ON COLUMN "payment"."payment_method" IS 'Payment Method';
COMMENT ON COLUMN "payment"."payment_status" IS 'Payment Status';
COMMENT ON COLUMN "payment"."pg_provider" IS 'PG Provider';
COMMENT ON COLUMN "payment"."pg_transaction_id" IS 'PG Transaction ID';
COMMENT ON COLUMN "payment"."paid_at" IS 'Paid timestamp';
COMMENT ON COLUMN "payment"."refund_amount" IS 'Refund Amount';
COMMENT ON COLUMN "payment"."refunded_at" IS 'Refunded timestamp';
COMMENT ON COLUMN "payment"."failure_reason" IS 'Failure Reason';
COMMENT ON COLUMN "payment"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "payment"."updated_at" IS 'Updated timestamp';
COMMENT ON COLUMN "coupon"."coupon_code" IS 'Coupon Code';
COMMENT ON COLUMN "coupon"."coupon_name" IS 'Coupon Name';
COMMENT ON COLUMN "coupon"."discount_type" IS 'Discount Type';
COMMENT ON COLUMN "coupon"."discount_value" IS 'Discount Value';
COMMENT ON COLUMN "coupon"."max_discount_amount" IS 'maximum Discount Amount';
COMMENT ON COLUMN "coupon"."min_order_amount" IS 'minimum Order Amount';
COMMENT ON COLUMN "coupon"."usage_limit" IS 'Usage Limit';
COMMENT ON COLUMN "coupon"."used_count" IS 'Used Count';
COMMENT ON COLUMN "coupon"."per_user_limit" IS 'Per User Limit';
COMMENT ON COLUMN "coupon"."valid_from" IS 'Valid From';
COMMENT ON COLUMN "coupon"."valid_until" IS 'Valid Until';
COMMENT ON COLUMN "coupon"."coupon_status" IS 'Coupon Status';
COMMENT ON COLUMN "coupon"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "promotion"."promotion_name" IS 'Promotion Name';
COMMENT ON COLUMN "promotion"."promotion_desc" IS 'Promotion description';
COMMENT ON COLUMN "promotion"."discount_type" IS 'Discount Type';
COMMENT ON COLUMN "promotion"."discount_value" IS 'Discount Value';
COMMENT ON COLUMN "promotion"."target_plan_id" IS 'Target Plan ID';
COMMENT ON COLUMN "promotion"."target_billing_months" IS 'Target Billing Months';
COMMENT ON COLUMN "promotion"."valid_from" IS 'Valid From';
COMMENT ON COLUMN "promotion"."valid_until" IS 'Valid Until';
COMMENT ON COLUMN "promotion"."promotion_status" IS 'Promotion Status';
COMMENT ON COLUMN "promotion"."created_at" IS 'Created timestamp';
COMMENT ON COLUMN "payment_discount"."payment_id" IS 'Payment ID';
COMMENT ON COLUMN "payment_discount"."discount_type" IS 'Discount Type';
COMMENT ON COLUMN "payment_discount"."discount_ref_id" IS 'Discount reference ID';
COMMENT ON COLUMN "payment_discount"."discount_amount" IS 'Discount Amount';
COMMENT ON COLUMN "payment_discount"."discount_desc" IS 'Discount description';
COMMENT ON COLUMN "payment_discount"."created_at" IS 'Created timestamp';

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
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_created_by" ON "inventory_transaction" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_bom_header_project_id" ON "bom_header" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_bom_header_target_item_id" ON "bom_header" ("target_item_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_inventory_id" ON "inventory_transaction" ("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_transaction_reference_id" ON "inventory_transaction" ("reference_id");
CREATE INDEX IF NOT EXISTS "idx_flow_rule_project_id" ON "flow_rule" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_flow_rule_target" ON "flow_rule" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "idx_flow_rule_enabled_yn" ON "flow_rule" ("enabled_yn");
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
