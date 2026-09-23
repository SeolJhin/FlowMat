package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Arrays;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Boots the whole application against real Postgres and Redis containers.
 *
 * <p>Fails when the context cannot start, when any Flyway migration fails, or when a JPA entity no longer
 * matches the migrated schema ({@code ddl-auto=validate}) — the class of bug behind the earlier missing
 * {@code deleted_yn}/{@code updated_at} columns and unmapped jsonb columns.
 */
class FlowMatSmokeTest extends IntegrationTestSupport {

    @Autowired
    private Flyway flyway;

    @Test
    void contextLoadsAndSchemaMatchesEntities() {
        // Reaching this point means Flyway migrated and Hibernate validated every entity against the schema.
        assertNotNull(flyway.info().current(), "Flyway should have applied at least one migration");
    }

    @Test
    void allMigrationsAreApplied() {
        MigrationInfo[] notApplied = Arrays.stream(flyway.info().all())
            .filter(info -> info.getState() != MigrationState.SUCCESS && info.getState() != MigrationState.BASELINE)
            .toArray(MigrationInfo[]::new);

        assertEquals(0, notApplied.length, () -> "Migrations not applied: " + Arrays.stream(notApplied)
            .map(info -> info.getVersion() + " " + info.getDescription() + " [" + info.getState() + "]")
            .toList());
    }
}
