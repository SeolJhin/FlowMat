package org.myweb.flowmat.domain.bom.application;

import org.myweb.flowmat.domain.bom.api.dto.response.BomResponse;

/** BOM approval flow: draft → pending_approval → approved → retired, with reject back to draft. */
public interface BomApprovalService {

    BomResponse submit(String bomId);

    BomResponse approve(String bomId, String note);

    BomResponse reject(String bomId, String note);

    BomResponse retire(String bomId, String note);
}
