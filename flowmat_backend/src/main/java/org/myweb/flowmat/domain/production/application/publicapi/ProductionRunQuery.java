package org.myweb.flowmat.domain.production.application.publicapi;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Production run reads for other bounded contexts, which use this instead of the production repositories
 * (docs/architecture/adr/ADR-002-module-dependency.md). Add an operation only when a caller needs it.
 */
public interface ProductionRunQuery {

    /** The run if it exists, is not deleted and belongs to the project. */
    Optional<ProductionRunView> findProjectRun(String projectId, String productionRunId);

    /** Runs by id, deleted ones included so old references still show a number; ids that do not exist are left out. */
    Map<String, ProductionRunView> findRuns(Collection<String> productionRunIds);
}
