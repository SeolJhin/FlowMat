package org.myweb.flowmat.domain.inventory.application.publicapi;

/**
 * Stock record reads for other bounded contexts, which use this instead of the inventory repositories
 * (docs/architecture/adr/ADR-002-module-dependency.md). Add an operation only when a caller needs it.
 */
public interface StockQuery {

    /** Whether the item has a stock record that is not deleted, holding stock or not. */
    boolean hasStockRecords(String itemId);
}
