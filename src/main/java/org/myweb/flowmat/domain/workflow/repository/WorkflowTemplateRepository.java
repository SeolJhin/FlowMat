package org.myweb.flowmat.domain.workflow.repository;

import org.myweb.flowmat.domain.workflow.domain.entity.WorkflowTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowTemplateRepository extends JpaRepository<WorkflowTemplate, String> {
}
