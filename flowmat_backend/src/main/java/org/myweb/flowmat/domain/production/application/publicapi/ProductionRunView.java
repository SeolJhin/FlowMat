package org.myweb.flowmat.domain.production.application.publicapi;

/** What another bounded context may read about a production run. */
public record ProductionRunView(
    String productionRunId,
    String projectId,
    String runNumber,
    String runStatus
) {
}
