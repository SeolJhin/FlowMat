package org.myweb.flowmat.domain.workflow.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.BaseTimeEntity;

@Getter
@Setter
@Entity
@Table(name = "workflow_template")
public class WorkflowTemplate extends BaseTimeEntity {

    @Id
    private String templateId;

    private String templateName;
    private String templateCategory;
    private String templateType;
}
