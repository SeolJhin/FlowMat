package org.myweb.flowmat.domain.bom.application;

import java.math.BigDecimal;
import java.util.List;
import org.myweb.flowmat.domain.bom.api.dto.request.BomCreateRequest;
import org.myweb.flowmat.domain.bom.api.dto.request.BomLineCreateRequest;
import org.myweb.flowmat.domain.bom.api.dto.request.BomUpdateRequest;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomWhereUsedResponse;

/** BOM revisions and their materials (docs/domain/inventory-bom-lot-contract.md §5). */
public interface BomService {

    List<BomResponse> listBoms(String projectId, String targetItemId);

    /** BOM revisions of the project that use the item as a line: approved first, then drafts, then retired. */
    List<BomWhereUsedResponse> whereUsed(String projectId, String itemId);

    BomResponse getBom(String bomId);

    BomResponse createBom(BomCreateRequest request);

    BomResponse updateBom(String bomId, BomUpdateRequest request);

    /** Soft-deletes a draft; submitted revisions are kept as history. */
    void deleteBom(String bomId);

    BomResponse addLine(String bomId, BomLineCreateRequest request);

    BomResponse deleteLine(String bomId, String bomLineId);

    /** Copies an approved or retired revision into a new draft with the next version number. */
    BomResponse createRevision(String bomId);

    BomRequirementResponse calculateRequirements(String bomId, BigDecimal productionQuantity);

    /**
     * Requirements for a production run, frozen at start: the BOM must be approved, in the project, and for the
     * run's target item. Access checks are the caller's job.
     */
    BomRequirementResponse requirementsForRun(String bomId, String projectId, String targetItemId, BigDecimal productionQuantity);
}
