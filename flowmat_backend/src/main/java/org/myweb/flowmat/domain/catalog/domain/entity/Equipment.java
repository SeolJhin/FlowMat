package org.myweb.flowmat.domain.catalog.domain.entity;

import jakarta.persistence.Column;
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
@Table(name = "equipment")
public class Equipment extends CreatedUpdatedAuditEntity {

    @Id
    private String equipmentId;

    private String projectId;
    private String equipmentCode;
    private String equipmentName;
    private String equipmentType;
    private String equipmentStatus;

    private String manufacturer;
    private String modelName;
    private String serialNo;

    @Column(precision = 14, scale = 4)
    private BigDecimal capacityPerHour;

    @Column(precision = 10, scale = 4)
    private BigDecimal powerKwh;

    @Column(precision = 14, scale = 4)
    private BigDecimal waterLiter;

    private String location;
}
