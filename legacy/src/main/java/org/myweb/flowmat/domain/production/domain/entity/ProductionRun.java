package org.myweb.flowmat.domain.production.domain.entity;

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
@Table(name = "production_run")
public class ProductionRun extends CreatedUpdatedAuditEntity {

    @Id
    private String productionRunId;

    private String projectId;
    private String workflowId;
    private String workOrderId;
    private String bomId;
    private String runNumber;
    private String runType;
    private String runStatus;
    private String targetItemId;
    private BigDecimal plannedOutputQty;
    private BigDecimal actualOutputQty;
    private String startedBy;
    private String finishedBy;
}
