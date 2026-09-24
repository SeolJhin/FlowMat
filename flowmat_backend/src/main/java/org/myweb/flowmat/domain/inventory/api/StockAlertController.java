package org.myweb.flowmat.domain.inventory.api;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.response.StockAlertResponse;
import org.myweb.flowmat.domain.inventory.application.StockAlertService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Stock alerts (docs/domain/stock-alert.md). Read only: alerts open and close with the stock itself. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/stock-alerts")
public class StockAlertController {

    private final StockAlertService stockAlertService;

    @GetMapping
    public ApiResponse<List<StockAlertResponse>> listAlerts(
        @RequestParam("projectId") String projectId,
        @RequestParam(value = "openOnly", defaultValue = "true") boolean openOnly
    ) {
        return ApiResponse.ok(stockAlertService.listAlerts(projectId, openOnly));
    }
}
