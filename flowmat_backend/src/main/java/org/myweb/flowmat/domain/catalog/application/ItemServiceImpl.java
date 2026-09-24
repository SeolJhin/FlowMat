package org.myweb.flowmat.domain.catalog.application;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.ItemResponse;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemServiceImpl implements ItemService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";

    private final ItemRepository itemRepository;
    private final IdGenerator idGenerator;
    private final ProjectAccessService projectAccessService;
    private final UnitMasterRepository unitMasterRepository;
    private final InventoryRepository inventoryRepository;
    /** Other domains that still rely on an item; see {@link ItemUsageCheck}. */
    private final List<ItemUsageCheck> itemUsageChecks;

    /** Blank clears the unit; otherwise it must reference an active unit_master row. */
    private String requireActiveUnit(String unitId) {
        String normalized = trimToNull(unitId);
        if (normalized == null) {
            return null;
        }
        boolean active = unitMasterRepository.findById(normalized)
            .map(unit -> "Y".equalsIgnoreCase(unit.getActiveYn()))
            .orElse(false);
        if (!active) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Unit '" + normalized + "' does not exist or is inactive.");
        }
        return normalized;
    }

    @Override
    public List<ItemResponse> listItems(String projectId) {
        projectAccessService.requireProjectReadAccess(projectId);
        return itemRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED).stream()
            .map(ItemServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ItemResponse createItem(ItemCreateRequest request) {
        projectAccessService.requireProjectWriteAccess(request.projectId());

        Item item = new Item();
        item.setItemId(idGenerator.generate());
        item.setProjectId(request.projectId().trim());
        item.setItemCode(request.itemCode().trim());
        item.setItemName(request.itemName().trim());
        item.setItemType(defaultIfBlank(request.itemType(), "generic"));
        item.setResourceCategory(defaultIfBlank(request.resourceCategory(), "material"));
        item.setResourceType(trimToNull(request.resourceType()));
        item.setUnitId(requireActiveUnit(request.unitId()));
        item.setItemStatus(defaultIfBlank(request.itemStatus(), "active"));
        item.setLotManageYn(yn(request.lotManageYn()));
        item.setDeletedYn(NOT_DELETED);
        return toResponse(itemRepository.save(item));
    }

    @Override
    public ItemResponse getItem(String itemId) {
        Item item = findActiveItem(itemId);
        projectAccessService.requireProjectReadAccess(item.getProjectId());
        return toResponse(item);
    }

    @Override
    @Transactional
    public ItemResponse updateItem(String itemId, ItemUpdateRequest request) {
        Item item = findActiveItem(itemId);
        projectAccessService.requireProjectWriteAccess(item.getProjectId());
        if (hasText(request.itemName())) {
            item.setItemName(request.itemName().trim());
        }
        if (hasText(request.itemType())) {
            item.setItemType(request.itemType().trim().toLowerCase());
        }
        if (hasText(request.resourceCategory())) {
            item.setResourceCategory(request.resourceCategory().trim().toLowerCase());
        }
        if (request.resourceType() != null) {
            item.setResourceType(trimToNull(request.resourceType()));
        }
        if (request.unitId() != null) {
            item.setUnitId(requireActiveUnit(request.unitId()));
        }
        if (hasText(request.itemStatus())) {
            item.setItemStatus(request.itemStatus().trim().toLowerCase());
        }
        if (request.lotManageYn() != null && !yn(request.lotManageYn()).equals(item.getLotManageYn())) {
            // Existing stock rows were created under the old rule; switching would leave them inconsistent.
            if (inventoryRepository.existsByItemIdAndDeletedYn(item.getItemId(), NOT_DELETED)) {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "LOT tracking can only change while the item has no stock records.");
            }
            item.setLotManageYn(yn(request.lotManageYn()));
        }
        return toResponse(itemRepository.save(item));
    }

    @Override
    @Transactional
    public void deleteItem(String itemId) {
        Item item = findActiveItem(itemId);
        projectAccessService.requireProjectOwnerAccess(item.getProjectId());
        List<String> reasons = itemUsageChecks.stream()
            .map(check -> check.whyInUse(item))
            .flatMap(Optional::stream)
            .toList();
        if (!reasons.isEmpty()) {
            throw new BusinessException(ErrorCode.CONFLICT,
                item.getItemCode() + " cannot be deleted: " + String.join("; and ", reasons) + ".");
        }
        item.setDeletedYn(DELETED);
        item.setItemStatus("deleted");
        itemRepository.save(item);
    }

    private Item findActiveItem(String itemId) {
        return itemRepository.findByItemIdAndDeletedYn(itemId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static ItemResponse toResponse(Item item) {
        return new ItemResponse(
            item.getItemId(),
            item.getProjectId(),
            item.getItemCode(),
            item.getItemName(),
            item.getItemType(),
            item.getResourceCategory(),
            item.getResourceType(),
            item.getUnitId(),
            item.getItemStatus(),
            item.getLotManageYn()
        );
    }

    private static String yn(String value) {
        return "Y".equalsIgnoreCase(value == null ? null : value.trim()) ? "Y" : "N";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return hasText(value) ? value.trim().toLowerCase() : defaultValue;
    }
}
