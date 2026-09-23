package org.myweb.flowmat.domain.production.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "production_run_item")
public class ProductionRunItem {

    @Id
    private String productionRunItemId;

    private String productionRunId;
    private String processId;
    private String processIoId;
    private String inventoryId;
    private String itemId;
    private String lotId;
    private String direction;
    private BigDecimal plannedQty;
    private BigDecimal actualQty;
    private String unit;

    /** "manual" when recorded by hand, "bom" when planned from a BOM snapshot. */
    private String quantitySource;

    /** BOM snapshot: factor from the BOM line unit to the item unit, fixed when the run starts. */
    private BigDecimal conversionRate;
}
