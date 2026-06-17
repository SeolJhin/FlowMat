package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.api.dto.request.InventoryAdjustRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.InventoryResponse;
import org.myweb.flowmat.domain.rule.application.FlowRuleEngineService;
import org.myweb.flowmat.domain.rule.application.RuleEvaluationContext;
import org.myweb.flowmat.domain.rule.application.RuleTarget;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryServiceImpl implements InventoryService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";

    private final InventoryRepository inventoryRepository;
    private final ProjectRepository projectRepository;
    private final ItemRepository itemRepository;
    private final InventoryTransactionService inventoryTransactionService;
    private final FlowRuleEngineService flowRuleEngineService;
    private final IdGenerator idGenerator;

    @Override
    public List<InventoryResponse> listInventories(String projectId) {
        ensureProjectExists(projectId);
        return inventoryRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED).stream()
            .map(InventoryServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public InventoryResponse createInventory(InventoryAdjustRequest request) {
        ensureProjectExists(request.projectId());
        Item item = findActiveItem(request.itemId());
        validateSameProject(request.projectId(), item.getProjectId());
        evaluateRules(
            request.projectId(),
            List.of(
                new RuleTarget("project", request.projectId()),
                new RuleTarget("item", item.getItemId())
            ),
            Map.of(
                "operation", "inventory_create",
                "request", request,
                "item", item
            )
        );

        Inventory inventory = new Inventory();
        inventory.setInventoryId(idGenerator.generate());
        inventory.setProjectId(request.projectId().trim());
        inventory.setItemId(item.getItemId());
        inventory.setQuantity(request.quantity());
        inventory.setReservedQuantity(defaultIfNull(request.reservedQuantity(), BigDecimal.ZERO));
        inventory.setAvailableQuantity(
            defaultIfNull(request.availableQuantity(), request.quantity().subtract(defaultIfNull(request.reservedQuantity(), BigDecimal.ZERO)))
        );
        inventory.setLocation(trimToNull(request.location()));
        inventory.setInventoryStatus(defaultIfBlank(request.inventoryStatus(), "available"));
        inventory.setDeletedYn(NOT_DELETED);
        Inventory savedInventory = inventoryRepository.save(inventory);
        inventoryTransactionService.recordSystemTransaction(
            savedInventory,
            "create",
            savedInventory.getQuantity(),
            savedInventory.getReservedQuantity(),
            savedInventory.getAvailableQuantity(),
            "inventory",
            savedInventory.getInventoryId(),
            "Inventory created",
            null
        );
        return toResponse(savedInventory);
    }

    @Override
    public InventoryResponse getInventory(String inventoryId) {
        return toResponse(findActiveInventory(inventoryId));
    }

    @Override
    @Transactional
    public InventoryResponse updateInventory(String inventoryId, InventoryAdjustRequest request) {
        Inventory inventory = findActiveInventory(inventoryId);
        Item item = findActiveItem(request.itemId());
        validateSameProject(inventory.getProjectId(), request.projectId());
        validateSameProject(inventory.getProjectId(), item.getProjectId());
        evaluateRules(
            inventory.getProjectId(),
            List.of(
                new RuleTarget("project", inventory.getProjectId()),
                new RuleTarget("item", item.getItemId()),
                new RuleTarget("inventory", inventory.getInventoryId())
            ),
            Map.of(
                "operation", "inventory_update",
                "request", request,
                "inventory", inventory,
                "item", item
            )
        );

        BigDecimal quantityBefore = inventory.getQuantity();
        BigDecimal reservedBefore = inventory.getReservedQuantity();
        BigDecimal availableBefore = inventory.getAvailableQuantity();

        inventory.setItemId(item.getItemId());
        inventory.setQuantity(request.quantity());
        inventory.setReservedQuantity(defaultIfNull(request.reservedQuantity(), BigDecimal.ZERO));
        inventory.setAvailableQuantity(
            defaultIfNull(request.availableQuantity(), request.quantity().subtract(defaultIfNull(request.reservedQuantity(), BigDecimal.ZERO)))
        );
        inventory.setLocation(trimToNull(request.location()));
        inventory.setInventoryStatus(defaultIfBlank(request.inventoryStatus(), inventory.getInventoryStatus()));
        Inventory savedInventory = inventoryRepository.save(inventory);
        inventoryTransactionService.recordSystemTransaction(
            savedInventory,
            "adjust",
            savedInventory.getQuantity().subtract(quantityBefore),
            savedInventory.getReservedQuantity().subtract(reservedBefore),
            savedInventory.getAvailableQuantity().subtract(availableBefore),
            "inventory",
            savedInventory.getInventoryId(),
            "Inventory adjusted",
            null
        );
        return toResponse(savedInventory);
    }

    @Override
    @Transactional
    public void deleteInventory(String inventoryId) {
        Inventory inventory = findActiveInventory(inventoryId);
        evaluateRules(
            inventory.getProjectId(),
            List.of(
                new RuleTarget("project", inventory.getProjectId()),
                new RuleTarget("inventory", inventory.getInventoryId())
            ),
            Map.of(
                "operation", "inventory_delete",
                "inventory", inventory
            )
        );
        inventory.setDeletedYn(DELETED);
        Inventory savedInventory = inventoryRepository.save(inventory);
        inventoryTransactionService.recordSystemTransaction(
            savedInventory,
            "delete",
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "inventory",
            savedInventory.getInventoryId(),
            "Inventory deleted",
            null
        );
    }

    private void ensureProjectExists(String projectId) {
        projectRepository.findByProjectIdAndDeletedYn(projectId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Inventory findActiveInventory(String inventoryId) {
        return inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static InventoryResponse toResponse(Inventory inventory) {
        return new InventoryResponse(
            inventory.getInventoryId(),
            inventory.getProjectId(),
            inventory.getItemId(),
            inventory.getQuantity(),
            inventory.getReservedQuantity(),
            inventory.getAvailableQuantity(),
            inventory.getInventoryStatus(),
            inventory.getLocation()
        );
    }

    private static void validateSameProject(String expectedProjectId, String actualProjectId) {
        if (!expectedProjectId.equals(actualProjectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return value != null && !value.isBlank() ? value.trim().toLowerCase() : defaultValue;
    }

    private static BigDecimal defaultIfNull(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : defaultValue;
    }

    private void evaluateRules(String projectId, List<RuleTarget> targets, Map<String, Object> facts) {
        flowRuleEngineService.validateRules(new RuleEvaluationContext(projectId.trim(), new ArrayList<>(targets), facts));
    }
}
