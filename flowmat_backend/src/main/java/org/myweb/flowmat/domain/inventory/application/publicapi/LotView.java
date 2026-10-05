package org.myweb.flowmat.domain.inventory.application.publicapi;

/** What another bounded context may read about a LOT. */
public record LotView(
    String lotId,
    String projectId,
    String itemId,
    String lotNo
) {
}
