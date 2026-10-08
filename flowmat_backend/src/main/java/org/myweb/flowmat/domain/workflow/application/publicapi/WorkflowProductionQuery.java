package org.myweb.flowmat.domain.workflow.application.publicapi;
import java.util.Optional;
/** Immutable manufacturing references; the caller authorizes the project before invoking a lock. */
public interface WorkflowProductionQuery {
    record Facts(String json) { }
    record Revision(String workflowRevisionId, String status, String snapshotJson, int revisionNo) { }
    Optional<Facts> findWorkflow(String id);
    Facts lockWorkflow(String id);
    Optional<Facts> findProcess(String id);
    Optional<Facts> findProcessIo(String id);
    Optional<Revision> findRevision(String id,String workflowId);
    Optional<Revision> latestPublishedRevision(String workflowId);
}
