package org.myweb.flowmat.domain.bom.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.BaseTimeEntity;

@Getter
@Setter
@Entity
@Table(name = "bom_line")
public class BomLine extends BaseTimeEntity {

    @Id
    private String bomLineId;

    private String bomId;
    private String childItemId;
    private String lineType;
    private BigDecimal quantity;
    private String unit;
}
