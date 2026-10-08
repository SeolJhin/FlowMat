package org.myweb.flowmat.domain.workflow.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.application.publicapi.WorkflowProductionQuery;
import org.myweb.flowmat.domain.workflow.domain.entity.WorkflowRevision;
import org.myweb.flowmat.domain.workflow.repository.*;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkflowProductionQueryImpl implements WorkflowProductionQuery {
    private final WorkflowRepository workflows;
    private final WorkflowRevisionRepository revisions;
    private final ProcessRepository processes;
    private final ProcessIoRepository ports;
    private final ObjectMapper json;
    private final EntityManager entities;
    public Optional<Facts> findWorkflow(String id) { return workflows.findByWorkflowIdAndDeletedYn(id,"N").map(this::facts); }
    @Transactional(propagation=Propagation.MANDATORY)
    public Facts lockWorkflow(String id) {
        var row=workflows.findByWorkflowIdAndDeletedYn(id,"N").orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        entities.refresh(row,LockModeType.PESSIMISTIC_WRITE);
        if(!"N".equals(row.getDeletedYn())) throw new BusinessException(ErrorCode.NOT_FOUND);
        return facts(row);
    }
    public Optional<Facts> findProcess(String id) { return processes.findByProcessIdAndDeletedYn(id,"N").map(this::facts); }
    public Optional<Facts> findProcessIo(String id) { return ports.findByProcessIoIdAndDeletedYn(id,"N").map(this::facts); }
    public Optional<Revision> findRevision(String id,String workflowId) { return revisions.findByWorkflowRevisionIdAndWorkflowId(id,workflowId).map(this::revision); }
    public Optional<Revision> latestPublishedRevision(String workflowId) { return revisions.findTopByWorkflowIdAndStatusOrderByRevisionNoDesc(workflowId,"published").map(this::revision); }
    private Facts facts(Object row) {
        try { return new Facts(json.writeValueAsString(row)); }
        catch(JsonProcessingException error) { throw new IllegalStateException("Cannot serialize internal rule facts.",error); }
    }
    private Revision revision(WorkflowRevision row) { return new Revision(row.getWorkflowRevisionId(),row.getStatus(),row.getSnapshotJson(),row.getRevisionNo()); }
}
