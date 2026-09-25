package org.myweb.flowmat.domain.inventory.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.response.StockMovementAnalysisResponse;
import org.myweb.flowmat.domain.inventory.application.StockMovementAnalysisService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Consumption, days of cover and idle stock per item (docs/domain/stock-analysis.md). Read only. */
@RestController
@RequiredArgsConstructor
public class StockAnalysisController {

    private final StockMovementAnalysisService stockMovementAnalysisService;

    @GetMapping("/stock-analysis")
    public ApiResponse<StockMovementAnalysisResponse> analyse(
        @RequestParam("projectId") String projectId,
        @RequestParam(value = "days", required = false) Integer days
    ) {
        return ApiResponse.ok(stockMovementAnalysisService.analyse(projectId, days));
    }
}
