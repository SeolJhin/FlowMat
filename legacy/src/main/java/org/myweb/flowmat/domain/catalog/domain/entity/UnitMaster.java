package org.myweb.flowmat.domain.catalog.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.BaseTimeEntity;

@Getter
@Setter
@Entity
@Table(name = "unit_master")
public class UnitMaster extends BaseTimeEntity {

    @Id
    private String unitId;

    private String unitCode;
    private String unitName;
    private String unitType;
}
