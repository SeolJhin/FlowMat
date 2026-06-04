package org.myweb.flowmat.domain.catalog.api.dto.request;

public record ItemCreateRequest(String projectId, String itemCode, String itemName, String unitId) {
}
