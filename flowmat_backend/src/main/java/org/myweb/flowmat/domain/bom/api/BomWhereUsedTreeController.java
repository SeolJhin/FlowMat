package org.myweb.flowmat.domain.bom.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomWhereUsedTreeResponse;
import org.myweb.flowmat.domain.bom.application.BomWhereUsedTreeService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Where an item is used at every level, through approved BOMs (docs/domain/multi-level-bom.md). Read only. */
@RestController
@RequiredArgsConstructor
public class BomWhereUsedTreeController {

    private final BomWhereUsedTreeService bomWhereUsedTreeService;

    @GetMapping("/boms/where-used/all-levels")
    public ApiResponse<BomWhereUsedTreeResponse> allLevels(
        @RequestParam("projectId") String projectId,
        @RequestParam("itemId") String itemId
    ) {
        return ApiResponse.ok(bomWhereUsedTreeService.allLevels(projectId, itemId));
    }
}
