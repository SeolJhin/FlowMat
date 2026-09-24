package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * V18 must never delete a demo project that holds real data. Runs the migration body again with the non-demo setting,
 * inside a transaction that is always rolled back so the shared test data stays intact.
 */
class DemoSeedCleanupMigrationTest extends IntegrationTestSupport {

    private static final String V18 = "db/migration/V18__remove_demo_data_from_non_demo_environment.sql";

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private PlatformTransactionManager transactionManager;

    @Test
    void demoSeedIsKeptWhenTheDemoProjectHoldsMoreThanTheSeed() throws Exception {
        String script = new ClassPathResource(V18).getContentAsString(StandardCharsets.UTF_8);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(status -> {
            jdbcTemplate.execute("SET LOCAL flowmat.demo_seed_enabled = 'false'");
            // Real data in the demo project: an item someone added.
            String itemId = "itm-v18-" + UUID.randomUUID().toString().substring(0, 8);
            jdbcTemplate.update("""
                insert into item (item_id, project_id, item_code, item_name, resource_category, item_status, deleted_yn)
                values (?, ?, ?, ?, 'material', 'active', 'N')
                """, itemId, DEMO_PROJECT, itemId.toUpperCase(), itemId);

            jdbcTemplate.execute(script);

            assertThat(count("users", "user_id", DEMO_OWNER)).isOne();
            assertThat(count("project", "project_id", DEMO_PROJECT)).isOne();
            assertThat(count("workflow", "workflow_id", DEMO_WORKFLOW)).isOne();
            status.setRollbackOnly();
        });
    }

    @Test
    void demoEnvironmentsKeepTheSeed() throws Exception {
        String script = new ClassPathResource(V18).getContentAsString(StandardCharsets.UTF_8);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(status -> {
            jdbcTemplate.execute("SET LOCAL flowmat.demo_seed_enabled = 'true'");
            jdbcTemplate.execute(script);
            assertThat(count("users", "user_id", DEMO_OWNER)).isOne();
            status.setRollbackOnly();
        });
    }

    private int count(String table, String column, String value) {
        return jdbcTemplate.queryForObject(
            "select count(*) from \"" + table + "\" where \"" + column + "\" = ?", Integer.class, value);
    }
}
