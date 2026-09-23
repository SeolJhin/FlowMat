package org.myweb.flowmat.domain.bom.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.myweb.flowmat.global.common.BaseTimeEntity;

/**
 * One material of a BOM revision. scrapRate, optionalYn and substituteGroup exist in the schema but are rejected at
 * approval in v1 (docs/domain/inventory-bom-lot-contract.md §5).
 */
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
    private BigDecimal scrapRate;
    @JdbcTypeCode(SqlTypes.CHAR)
    private String optionalYn;
    private String substituteGroup;
    private Integer sortOrder;
    private String note;
    private String createdBy;
}
