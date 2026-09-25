package org.myweb.flowmat.domain.catalog.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "item")
public class Item extends CreatedUpdatedAuditEntity {

    @Id
    private String itemId;

    private String projectId;
    private String itemCode;
    private String itemName;
    private String itemType;
    private String resourceCategory;
    private String resourceType;
    private String unitId;
    private String itemStatus;

    /** "Y" when stock of this item is tracked per LOT (docs/domain/inventory-bom-lot-contract.md §6). */
    @JdbcTypeCode(SqlTypes.CHAR)
    private String lotManageYn;

    /**
     * Stock to keep on hand across all of the item's records; below it the item is on the reorder list
     * (docs/domain/stock-alert.md "재주문 목록"). Null or 0 means not watched.
     */
    private BigDecimal safetyStockQty;

    /** Days from ordering to receiving, shown with the reorder list. */
    private Integer leadTimeDays;

    /**
     * Cost of one unit of the item in its own unit, used for BOM material cost and stock value
     * (docs/domain/material-cost.md). 0 or null means not known.
     */
    private BigDecimal unitCost;
}
