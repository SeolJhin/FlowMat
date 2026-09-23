package org.myweb.flowmat.domain.catalog.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
}
