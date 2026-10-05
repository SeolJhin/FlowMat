package org.myweb.flowmat.domain.catalog.application.publicapi;

import java.math.BigDecimal;

/** What another bounded context may read about a piece of equipment. {@code capacityPerHour} is null when unset. */
public record CatalogEquipmentView(
    String equipmentId,
    String projectId,
    String equipmentCode,
    String equipmentName,
    String equipmentStatus,
    BigDecimal capacityPerHour
) {

    /** The code, or the name when there is no code. */
    public String label() {
        return equipmentCode != null ? equipmentCode : equipmentName;
    }
}
