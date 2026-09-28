package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/** Exercises the V37-to-V38 upgrade only in a separate schema of the test container. */
class RunInstructionBindingMigrationIntegrationTest extends IntegrationTestSupport {

    @Test
    void upgradePinsTheEarliestSurvivingConfirmationAndLeavesUnconfirmedRunsUnbound() {
        String schema = "instruction_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        Flyway before = flyway(schema, "37");
        before.migrate();
        String jdbcUrl = POSTGRES.getJdbcUrl() + (POSTGRES.getJdbcUrl().contains("?") ? "&" : "?") + "currentSchema=" + schema;
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(jdbcUrl, POSTGRES.getUsername(), POSTGRES.getPassword()));
        jdbc.update("insert into item (item_id, project_id, item_code, item_name) values ('pin_item', ?, 'PIN-UPGRADE', 'Pin upgrade')",
            DEMO_PROJECT);
        jdbc.update("insert into work_instruction (instruction_id, project_id, item_id, revision_no, status, title) "
            + "values ('pin_old', ?, 'pin_item', 1, 'retired', 'Original'), ('pin_new', ?, 'pin_item', 2, 'released', 'Latest')",
            DEMO_PROJECT, DEMO_PROJECT);
        jdbc.update("insert into work_instruction_step (step_id, instruction_id, step_no, step_text) "
            + "values ('pin_step_old', 'pin_old', 1, 'Original step'), ('pin_step_new', 'pin_new', 1, 'New step')");
        jdbc.update("insert into production_run (production_run_id, project_id, run_number, planned_output_qty) "
            + "values ('pin_checked', ?, 'PIN-CHECKED', 1), ('pin_unchecked', ?, 'PIN-UNCHECKED', 1)", DEMO_PROJECT, DEMO_PROJECT);
        jdbc.update("insert into run_instruction_check (check_id, production_run_id, instruction_id, step_id, checked_by, checked_at) "
            + "values ('z_first', 'pin_checked', 'pin_old', 'pin_step_old', ?, '2026-01-01T00:00:00Z'), "
            + "('a_second', 'pin_checked', 'pin_new', 'pin_step_new', ?, '2026-01-02T00:00:00Z')", DEMO_OWNER, DEMO_OWNER);

        Flyway after = flyway(schema, "38");
        assertEquals(1, after.migrate().migrationsExecuted);
        assertEquals("38", after.info().current().getVersion().getVersion());
        assertEquals("pin_old", jdbc.queryForObject("select work_instruction_id from production_run where production_run_id = 'pin_checked'",
            String.class));
        assertNull(jdbc.queryForObject("select work_instruction_id from production_run where production_run_id = 'pin_unchecked'", String.class));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
            "update production_run set work_instruction_id = 'missing_instruction' where production_run_id = 'pin_unchecked'"));
        assertEquals(0, after.migrate().migrationsExecuted);
    }

    private Flyway flyway(String schema, String target) {
        return Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
            .schemas(schema).defaultSchema(schema).locations("classpath:db/migration").target(target)
            .initSql("SET flowmat.demo_seed_enabled = 'true'").load();
    }
}
