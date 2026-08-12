package org.myweb.flowmat.domain.workflow.editor.repository;

import org.myweb.flowmat.domain.workflow.editor.domain.WorkflowEditorDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowEditorDocumentRepository extends JpaRepository<WorkflowEditorDocument, String> {
}
