-- V18: Remove the V2 demo seed from environments that are not demo environments.
--
-- Applied migrations are immutable, so V2 still inserts the demo rows everywhere. This migration takes them out again
-- unless the Flyway init SQL marks the database as a demo environment:
--   dev / test : SET flowmat.demo_seed_enabled = 'true'   -> nothing happens
--   prod       : SET flowmat.demo_seed_enabled = 'false'  -> demo rows removed
--   not set    : treated as non-demo                     -> demo rows removed
--
-- Safety: rows are removed only when every demo signature matches (user id + email, project id + owner, workflow id +
-- project) AND nothing beyond the V2/V6/V7 seed refers to the demo project or user. If anything else is found (e.g. a
-- production database where someone actually used the demo project), nothing is removed and a NOTICE is raised.
DO $$
DECLARE
    demo_enabled boolean := COALESCE(current_setting('flowmat.demo_seed_enabled', true), '') = 'true';
    extra_rows bigint := 0;
    found_rows bigint;
    scoped record;
BEGIN
    IF demo_enabled THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "users" WHERE "user_id" = 'demo-owner' AND "user_email" = 'demo-owner@flowmat.local')
        OR NOT EXISTS (SELECT 1 FROM "project" WHERE "project_id" = 'prj_demo_main' AND "owner_id" = 'demo-owner')
        OR NOT EXISTS (SELECT 1 FROM "workflow" WHERE "workflow_id" = 'wf_demo_main' AND "project_id" = 'prj_demo_main')
    THEN
        RAISE NOTICE 'V18: demo seed signatures not all present; nothing removed.';
        RETURN;
    END IF;

    -- Any project-scoped table other than the seeded ones must hold nothing for the demo project.
    FOR scoped IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = current_schema()
          AND c.column_name = 'project_id'
          AND c.table_name NOT IN ('project', 'workflow', 'process', 'item', 'process_connection', 'project_member')
    LOOP
        EXECUTE format('SELECT count(*) FROM %I WHERE project_id = $1', scoped.table_name)
            INTO found_rows USING 'prj_demo_main';
        extra_rows := extra_rows + found_rows;
    END LOOP;

    -- The seeded tables may hold exactly the seed rows and nothing more.
    extra_rows := extra_rows
        + (SELECT count(*) FROM "workflow" WHERE "project_id" = 'prj_demo_main' AND "workflow_id" <> 'wf_demo_main')
        + (SELECT count(*) FROM "process" WHERE "project_id" = 'prj_demo_main'
              AND "process_id" NOT IN ('prc_demo_input', 'prc_demo_mix'))
        + (SELECT count(*) FROM "process_io" WHERE "process_id" IN ('prc_demo_input', 'prc_demo_mix')
              AND "process_io_id" NOT IN ('pio_demo_input_out', 'pio_demo_mix_in'))
        + (SELECT count(*) FROM "item" WHERE "project_id" = 'prj_demo_main' AND "item_id" <> 'itm_demo_mix_output')
        + (SELECT count(*) FROM "process_connection" WHERE "project_id" = 'prj_demo_main'
              AND "connection_id" <> 'pcn_demo_input_to_mix')
        + (SELECT count(*) FROM "project_member" WHERE "project_id" = 'prj_demo_main' AND "user_id" <> 'demo-owner')
        + (SELECT count(*) FROM "project_member" WHERE "user_id" = 'demo-owner' AND "project_id" <> 'prj_demo_main')
        + (SELECT count(*) FROM "project" WHERE "owner_id" = 'demo-owner' AND "project_id" <> 'prj_demo_main');

    IF extra_rows > 0 THEN
        RAISE NOTICE 'V18: the demo project/user has % row(s) beyond the seed; kept as is. Remove it by hand if intended.',
            extra_rows;
        RETURN;
    END IF;

    DELETE FROM "process_connection" WHERE "connection_id" = 'pcn_demo_input_to_mix';
    DELETE FROM "process_io" WHERE "process_io_id" IN ('pio_demo_input_out', 'pio_demo_mix_in');
    DELETE FROM "process" WHERE "process_id" IN ('prc_demo_input', 'prc_demo_mix');
    UPDATE "project" SET "current_workflow_id" = NULL WHERE "project_id" = 'prj_demo_main';
    DELETE FROM "workflow" WHERE "workflow_id" = 'wf_demo_main';
    DELETE FROM "item" WHERE "item_id" = 'itm_demo_mix_output';
    DELETE FROM "project_member" WHERE "project_id" = 'prj_demo_main';
    DELETE FROM "project" WHERE "project_id" = 'prj_demo_main';
    -- user_roles.user_id references users.id (uuid), not the login id.
    DELETE FROM "user_roles" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "user_id" = 'demo-owner');
    DELETE FROM "users" WHERE "user_id" = 'demo-owner';

    RAISE NOTICE 'V18: demo seed removed from this non-demo environment.';
END $$;
