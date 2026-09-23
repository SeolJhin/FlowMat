package org.myweb.flowmat.domain.inventory.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.request.LotCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.LotResponse;
import org.myweb.flowmat.domain.inventory.api.dto.response.LotTraceResponse;
import org.myweb.flowmat.domain.inventory.application.LotService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** LOTs (docs/domain/inventory-bom-lot-contract.md §6). Quarantine is a stock movement: POST /inventory-transactions. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/lots")
public class LotController {

    private final LotService lotService;

    @PostMapping
    public ApiResponse<LotResponse> createLot(@Valid @RequestBody LotCreateRequest request) {
        return ApiResponse.ok(lotService.createLot(request));
    }

    @GetMapping
    public ApiResponse<List<LotResponse>> listLots(
        @RequestParam("projectId") String projectId,
        @RequestParam(value = "itemId", required = false) String itemId
    ) {
        return ApiResponse.ok(lotService.listLots(projectId, itemId));
    }

    @GetMapping("/{lotId}")
    public ApiResponse<LotResponse> getLot(@PathVariable("lotId") String lotId) {
        return ApiResponse.ok(lotService.getLot(lotId));
    }

    @PostMapping("/{lotId}/close")
    public ApiResponse<LotResponse> closeLot(@PathVariable("lotId") String lotId) {
        return ApiResponse.ok(lotService.closeLot(lotId));
    }

    @GetMapping("/{lotId}/trace")
    public ApiResponse<LotTraceResponse> trace(
        @PathVariable("lotId") String lotId,
        @RequestParam(value = "direction", defaultValue = "backward") String direction
    ) {
        return ApiResponse.ok(lotService.trace(lotId, direction));
    }
}
