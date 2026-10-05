package org.myweb.flowmat.domain.inventory.application.publicapi;

import java.util.Optional;

/** Identity facts needed to validate an allocation's destination without exposing inventory repositories. */
public interface StockRecordQuery {
    record StockIdentity(String inventoryId, String itemId, String lotId) {}
    Optional<StockIdentity> findProjectStock(String projectId, String inventoryId);
}
