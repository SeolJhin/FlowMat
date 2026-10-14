package org.myweb.flowmat.domain.quality.application.publicapi;

import java.util.Collection;
import java.util.List;

/**
 * Nonconformity reads for other bounded contexts, which use this instead of the quality repositories
 * (docs/architecture/adr/ADR-002-module-dependency.md). Add an operation only when a caller needs it.
 */
public interface NonconformityQuery {

    /** Closed nonconformities of the projects with a check due day and no check recorded yet (notification NS7). */
    List<NcrCheckView> findPendingChecks(Collection<String> projectIds);
}
