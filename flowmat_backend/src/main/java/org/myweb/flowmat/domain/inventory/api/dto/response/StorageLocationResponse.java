package org.myweb.flowmat.domain.inventory.api.dto.response;

/**
 * @param path the codes from the top-level place down to this one, joined with " / "
 * @param depth how many places this one sits inside
 * @param stockRecords stock records here that hold stock (on hand or reserved)
 * @param itemCount different items in those records
 */
public record StorageLocationResponse(
    String locationId,
    String projectId,
    String parentLocationId,
    String locationCode,
    String locationName,
    String locationType,
    boolean active,
    String note,
    String path,
    int depth,
    long stockRecords,
    long itemCount
) {
}
