package org.myweb.flowmat.domain.catalog.api.dto.request;

public record ItemUpdateRequest(String itemName, String itemStatus, String specJson) {
}
