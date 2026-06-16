package org.myweb.flowmat.domain.catalog.api;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.ItemResponse;
import org.myweb.flowmat.domain.catalog.application.ItemService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/items")
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ApiResponse<List<ItemResponse>> listItems(@RequestParam String projectId) {
        return ApiResponse.ok(itemService.listItems(projectId));
    }

    @PostMapping
    public ApiResponse<ItemResponse> createItem(@Valid @RequestBody ItemCreateRequest request) {
        return ApiResponse.ok(itemService.createItem(request));
    }

    @GetMapping("/{itemId}")
    public ApiResponse<ItemResponse> getItem(@PathVariable String itemId) {
        return ApiResponse.ok(itemService.getItem(itemId));
    }

    @PutMapping("/{itemId}")
    public ApiResponse<ItemResponse> updateItem(
        @PathVariable String itemId,
        @RequestBody ItemUpdateRequest request
    ) {
        return ApiResponse.ok(itemService.updateItem(itemId, request));
    }

    @DeleteMapping("/{itemId}")
    public ApiResponse<Void> deleteItem(@PathVariable String itemId) {
        itemService.deleteItem(itemId);
        return ApiResponse.ok(null);
    }
}
