package org.myweb.flowmat.domain.workflow.editor.repository;

import org.myweb.flowmat.domain.workflow.editor.domain.WorkflowEditorDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface WorkflowEditorDocumentRepository extends JpaRepository<WorkflowEditorDocument, String> {
    @Override
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<WorkflowEditorDocument> findById(String workflowId);
}
