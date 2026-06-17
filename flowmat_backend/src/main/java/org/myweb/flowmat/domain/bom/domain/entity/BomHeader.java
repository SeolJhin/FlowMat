package org.myweb.flowmat.domain.bom.domain.entity;

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
@Table(name = "bom_header")
public class BomHeader extends CreatedUpdatedAuditEntity {

    @Id
    private String bomId;

    private String projectId;
    private String targetItemId;
    private String bomName;
    private Integer bomVersion;
    private BigDecimal baseQuantity;
    private String baseUnit;
    private String bomStatus;
    private String approvalStatus;
}
