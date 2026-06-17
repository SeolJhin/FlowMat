package org.myweb.flowmat.domain.inventory.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryTransactionCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryTransactionResponse;
import org.myweb.flowmat.domain.inventory.application.InventoryTransactionService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/inventory-transactions")
public class InventoryTransactionController {

    private final InventoryTransactionService inventoryTransactionService;

    @GetMapping
    public ApiResponse<List<InventoryTransactionResponse>> listTransactions(
        @RequestParam(required = false) String projectId,
        @RequestParam(required = false) String inventoryId
    ) {
        return ApiResponse.ok(inventoryTransactionService.listTransactions(projectId, inventoryId));
    }

    @PostMapping
    public ApiResponse<InventoryTransactionResponse> createTransaction(
        @Valid @RequestBody InventoryTransactionCreateRequest request
    ) {
        return ApiResponse.ok(inventoryTransactionService.createTransaction(request));
    }

    @GetMapping("/{inventoryTransactionId}")
    public ApiResponse<InventoryTransactionResponse> getTransaction(@PathVariable String inventoryTransactionId) {
        return ApiResponse.ok(inventoryTransactionService.getTransaction(inventoryTransactionId));
    }
}
