package org.myweb.flowmat.domain.catalog.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
}
