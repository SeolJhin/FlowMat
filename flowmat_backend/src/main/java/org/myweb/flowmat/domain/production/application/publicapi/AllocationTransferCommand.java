package org.myweb.flowmat.domain.production.application.publicapi;

import java.math.BigDecimal;
import java.util.List;

/** Called by inventory inside its movement transaction. Lock production before locking stock. */
public interface AllocationTransferCommand {
    record LockedAllocation(String inventoryId, String itemId, String lotId, BigDecimal remaining, boolean movable) {}
    record OpenAllocation(String allocationId, String inventoryId, String itemId, BigDecimal remaining) {}
    List<OpenAllocation> lockOpen(String projectId, String workOrderId);
    LockedAllocation lock(String projectId, String workOrderId, String allocationId);
    void move(String projectId, String workOrderId, String allocationId, String sourceInventoryId, String destinationInventoryId, BigDecimal quantity);
}
