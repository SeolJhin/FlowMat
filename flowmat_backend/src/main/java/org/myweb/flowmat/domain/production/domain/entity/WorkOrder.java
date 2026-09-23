package org.myweb.flowmat.domain.production.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
    /** Lowercase {@link org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus} code. */
    private String workOrderStatus;
    private String priority;
    private String targetItemId;

    @Column(precision = 14, scale = 4)
    private BigDecimal targetQuantity;

    private OffsetDateTime plannedStartAt;
    private OffsetDateTime plannedEndAt;
    private OffsetDateTime actualStartAt;
    private OffsetDateTime actualEndAt;

    @Column(columnDefinition = "text")
    private String instruction;

    private String assignedTo;
    private String issuedBy;
    private OffsetDateTime issuedAt;
    private String approvedBy;
    private OffsetDateTime approvedAt;
}
