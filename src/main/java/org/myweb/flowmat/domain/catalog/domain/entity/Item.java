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
@Table(name = "item")
public class Item extends CreatedUpdatedAuditEntity {

    @Id
    private String itemId;

    private String projectId;
    private String itemCode;
    private String itemName;
    private String itemType;
    private String resourceCategory;
    private String unitId;
    private String itemStatus;
}
