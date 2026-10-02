package org.myweb.flowmat.domain.bom.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomCostRollupResponse;
import org.myweb.flowmat.domain.bom.application.BomCostRollupService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Material cost per unit of every made item, rolled up through approved BOMs (docs/domain/multi-level-bom.md). Read only. */
@RestController
@RequiredArgsConstructor
public class BomCostRollupController {

    private final BomCostRollupService bomCostRollupService;

    @GetMapping("/boms/cost-rollup")
    public ApiResponse<BomCostRollupResponse> rollup(@RequestParam("projectId") String projectId) {
        return ApiResponse.ok(bomCostRollupService.rollup(projectId));
    }
}
