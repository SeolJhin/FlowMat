package org.myweb.flowmat.domain.workflow.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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
    private String fromIoId;
    private String toIoId;
    private String itemId;
    private String connectionType;
    private String connectionLabel;
    private BigDecimal flowRate;
    private String unit;
    private BigDecimal delayTimeSec;
    private BigDecimal lossRate;
    private Integer priority;
}
