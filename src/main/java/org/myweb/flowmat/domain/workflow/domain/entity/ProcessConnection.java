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
@Table(name = "process_connection")
public class ProcessConnection extends CreatedUpdatedAuditEntity {

    @Id
    private String connectionId;

    private String projectId;
    private String workflowId;
    private String fromProcessId;
    private String toProcessId;
    private String itemId;
    private String connectionType;
}
