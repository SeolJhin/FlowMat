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
@Table(name = "workflow")
public class Workflow extends CreatedUpdatedAuditEntity {

    @Id
    private String workflowId;

    private String projectId;
    private String workflowName;
    private String workflowDesc;
    private String workflowType;
    private String workflowStatus;
    private String canvasSnapshot;
    private String simulationConfig;
    private String lockedYn;
    private String lockedBy;
}
