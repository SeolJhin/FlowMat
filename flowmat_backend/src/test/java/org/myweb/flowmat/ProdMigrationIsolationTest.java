package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Verifies the production profile runs against real PostgreSQL without applying demo seed data.
 */
@SpringBootTest
@ActiveProfiles("prod")
class ProdMigrationIsolationTest {

    private static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16");
    private static final GenericContainer<?> REDIS =
        new GenericContainer<>("redis:7.4").withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    @DynamicPropertySource
    static void productionProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "2525");
        registry.add("spring.mail.username", () -> "prod-test");
        registry.add("spring.mail.password", () -> "prod-test-password");
        registry.add("jwt.secret", () -> "production-profile-test-secret-that-is-long-enough");
        registry.add("app.frontend-url", () -> "https://frontend.flowmat.test");
        registry.add("app.oauth2.redirect-uri", () -> "https://frontend.flowmat.test/oauth/callback");
        registry.add("app.cors.allowed-origins", () -> "https://frontend.flowmat.test");
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void productionProfileDoesNotInsertDemoRows() {
        assertThat(count("users", "user_id", "demo-owner")).isZero();
        assertThat(count("project", "project_id", "prj_demo_main")).isZero();
        assertThat(count("workflow", "workflow_id", "wf_demo_main")).isZero();
        // V2 still inserts the seed (applied migrations are immutable); V18 removes all of it outside demo environments.
        assertThat(count("item", "item_id", "itm_demo_mix_output")).isZero();
        assertThat(count("process", "project_id", "prj_demo_main")).isZero();
        assertThat(count("process_io", "process_io_id", "pio_demo_input_out")).isZero();
        assertThat(count("process_connection", "connection_id", "pcn_demo_input_to_mix")).isZero();
        assertThat(count("project_member", "user_id", "demo-owner")).isZero();
        assertThat(jdbcTemplate.queryForObject(
            "select count(*) from user_roles ur left join users u on u.id = ur.user_id where u.id is null",
            Integer.class)).as("no role rows left pointing at removed users").isZero();
    }

    private int count(String table, String column, String value) {
        return jdbcTemplate.queryForObject(
            "select count(*) from \"" + table + "\" where \"" + column + "\" = ?",
            Integer.class,
            value
        );
    }
}
