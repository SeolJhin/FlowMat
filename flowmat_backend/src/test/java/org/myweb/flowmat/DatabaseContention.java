package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.fail;

import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.springframework.jdbc.core.JdbcTemplate;

/** Synchronizes concurrency tests with a database lock, rather than relying on a fixed delay. */
final class DatabaseContention {

    private DatabaseContention() {
    }

    static void awaitWaitingOrDone(JdbcTemplate jdbc, Future<?> request, int blockerPid) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (!request.isDone() && !Boolean.TRUE.equals(jdbc.queryForObject(
            "select exists (select 1 from pg_stat_activity where ? = any(pg_blocking_pids(pid)))", Boolean.class, blockerPid))) {
            if (System.nanoTime() >= deadline) {
                fail("The competing request did not finish or reach the held database lock.");
            }
            try {
                Thread.sleep(20);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while observing database contention.", exception);
            }
        }
    }
}
