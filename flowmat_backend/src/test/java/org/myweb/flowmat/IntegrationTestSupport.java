package org.myweb.flowmat;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared base for tests that boot the full application against real Postgres and Redis.
 *
 * <p>Containers are started once per JVM (singleton pattern) and every subclass uses identical Spring
 * properties, so the application context is built once and reused across test classes.
 */
@ActiveProfiles("test")
@SpringBootTest(properties = {
    "spring.jpa.hibernate.ddl-auto=validate",
    "jwt.secret=smoke-test-secret-key-that-is-at-least-32-bytes",
    // Placeholders in application.yml must resolve; @ServiceConnection supplies the real container endpoints.
    "spring.data.redis.host=localhost",
    "spring.data.redis.port=6379",
    "spring.mail.host=localhost",
    "spring.mail.port=2525",
    "spring.mail.username=",
    "spring.mail.password=",
    "app.frontend-url=http://localhost:5173",
    "app.oauth2.redirect-uri=http://localhost:5173/oauth/callback",
    "app.cors.allowed-origins=http://localhost:5173",
})
public abstract class IntegrationTestSupport {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    @ServiceConnection(name = "redis")
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.4").withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    /** Seeded by V2__seed_demo.sql. */
    protected static final String DEMO_OWNER = "demo-owner";
    protected static final String DEMO_PROJECT = "prj_demo_main";
    protected static final String DEMO_WORKFLOW = "wf_demo_main";
}
