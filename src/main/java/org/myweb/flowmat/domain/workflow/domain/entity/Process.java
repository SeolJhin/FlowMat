package org.myweb.flowmat.domain.workflow.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "process")
public class Process extends CreatedUpdatedAuditEntity {

    @Id
    private String processId;

    private String projectId;
    private String workflowId;
    private String templateId;
    private String processName;
    private String processType;
    private String nodeType;
    private String processStatus;
    private Double posX;
    private Double posY;
}
