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
@Table(name = "work_order")
public class WorkOrder extends CreatedUpdatedAuditEntity {

    @Id
    private String workOrderId;

    private String projectId;
    private String workflowId;
    private String bomId;
    private String workOrderNumber;
    private String workOrderTitle;
    private String workOrderStatus;
    private String targetItemId;
    private BigDecimal targetQuantity;
    private String assignedTo;
}
