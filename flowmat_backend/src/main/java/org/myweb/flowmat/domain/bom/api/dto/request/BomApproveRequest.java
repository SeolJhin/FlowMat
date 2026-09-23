package org.myweb.flowmat.domain.bom.api.dto.request;

/**
 * Optional note for approve / reject / retire. The acting user comes from authentication, never from this body.
 */
public record BomApproveRequest(String note) {
}
