package org.myweb.flowmat.domain.inventory.domain.entity;

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
@Table(name = "inventory")
public class Inventory extends CreatedUpdatedAuditEntity {

    @Id
    private String inventoryId;

    private String projectId;
    private String itemId;
    private String lotId;
    private BigDecimal quantity;
    private BigDecimal reservedQuantity;
    private BigDecimal availableQuantity;
    private String inventoryStatus;
    private String location;
}
