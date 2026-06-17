package org.myweb.flowmat.domain.inventory.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.BaseTimeEntity;

@Getter
@Setter
@Entity
@Table(name = "lot_master")
public class LotMaster extends BaseTimeEntity {

    @Id
    private String lotId;

    private String projectId;
    private String itemId;
    private String inventoryId;
    private String productionRunId;
    private String lotNo;
    private OffsetDateTime producedAt;
    private String lotStatus;
}
