package org.myweb.flowmat.domain.quality.api.dto.response;

/** A LOT released after its receipt checks, with its status now (docs/domain/lot-release.md). */
public record LotReleaseResponse(String lotId, String lotNo, String lotStatus) {
}
