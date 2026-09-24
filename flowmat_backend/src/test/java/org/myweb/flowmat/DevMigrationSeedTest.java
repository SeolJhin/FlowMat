package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;

/** Verifies that a fresh development database keeps the demo rows needed by the browser E2E flow. */
@SpringBootTest
@ActiveProfiles("dev")
@ContextConfiguration(initializers = DevMigrationSeedTest.IgnoreLocalDevConfig.class)
class DevMigrationSeedTest {

    private static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16");
    private static final GenericContainer<?> REDIS =
        new GenericContainer<>("redis:7.4").withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    @DynamicPropertySource
    static void developmentProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
        registry.add("spring.mail.host", () -> "localhost");
        registry.add("spring.mail.port", () -> "2525");
        registry.add("spring.mail.username", () -> "dev-test");
        registry.add("spring.mail.password", () -> "dev-test-password");
        registry.add("jwt.secret", () -> "development-profile-test-secret-that-is-long-enough");
        registry.add("app.frontend-url", () -> "https://frontend.flowmat.test");
        registry.add("app.oauth2.redirect-uri", () -> "https://frontend.flowmat.test/oauth/callback");
        registry.add("app.cors.allowed-origins", () -> "https://frontend.flowmat.test");
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void developmentProfileKeepsDemoProjectAndActiveOwnerMembership() {
        assertThat(count("""
            select count(*) from users
            where user_id = 'demo-owner' and user_status = 'active' and delete_yn = 'N'
            """)).as("active demo user").isOne();
        assertThat(count("""
            select count(*) from project
            where project_id = 'prj_demo_main' and owner_id = 'demo-owner'
              and project_status = 'active' and deleted_yn = 'N'
            """)).as("visible demo project owned by the demo user").isOne();
        assertThat(count("""
            select count(*) from project_member
            where project_id = 'prj_demo_main' and user_id = 'demo-owner'
              and project_role = 'owner' and member_status = 'active'
            """)).as("active owner membership").isOne();
        assertThat(count("""
            select count(*) from workflow
            where workflow_id = 'wf_demo_main' and project_id = 'prj_demo_main' and deleted_yn = 'N'
            """)).as("demo workflow").isOne();
    }

    private int count(String sql) {
        return jdbcTemplate.queryForObject(sql, Integer.class);
    }

    /** The ignored application-dev.yml exists on some machines but is absent from CI checkouts. */
    static class IgnoreLocalDevConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext context) {
            List<String> localDevSources = new ArrayList<>();
            context.getEnvironment().getPropertySources().forEach(source -> {
                if (source.getName().contains("application-dev.yml")) {
                    localDevSources.add(source.getName());
                }
            });
            localDevSources.forEach(context.getEnvironment().getPropertySources()::remove);
        }
    }
}
