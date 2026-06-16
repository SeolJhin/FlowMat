package org.myweb.flowmat.domain.catalog.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemCreateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.ItemUpdateRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.ItemResponse;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
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
    private final ProjectRepository projectRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ItemResponse> listItems(String projectId) {
        ensureProjectExists(projectId);
        return itemRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED).stream()
            .map(ItemServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ItemResponse createItem(ItemCreateRequest request) {
        ensureProjectExists(request.projectId());

        Item item = new Item();
        item.setItemId(idGenerator.generate());
        item.setProjectId(request.projectId().trim());
        item.setItemCode(request.itemCode().trim());
        item.setItemName(request.itemName().trim());
        item.setItemType(defaultIfBlank(request.itemType(), "generic"));
        item.setResourceCategory(defaultIfBlank(request.resourceCategory(), "material"));
        item.setResourceType(trimToNull(request.resourceType()));
        item.setUnitId(trimToNull(request.unitId()));
        item.setItemStatus(defaultIfBlank(request.itemStatus(), "active"));
        item.setDeletedYn(NOT_DELETED);
        return toResponse(itemRepository.save(item));
    }

    @Override
    public ItemResponse getItem(String itemId) {
        return toResponse(findActiveItem(itemId));
    }

    @Override
    @Transactional
    public ItemResponse updateItem(String itemId, ItemUpdateRequest request) {
        Item item = findActiveItem(itemId);
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
            item.setUnitId(trimToNull(request.unitId()));
        }
        if (hasText(request.itemStatus())) {
            item.setItemStatus(request.itemStatus().trim().toLowerCase());
        }
        return toResponse(itemRepository.save(item));
    }

    @Override
    @Transactional
    public void deleteItem(String itemId) {
        Item item = findActiveItem(itemId);
        item.setDeletedYn(DELETED);
        item.setItemStatus("deleted");
        itemRepository.save(item);
    }

    private void ensureProjectExists(String projectId) {
        projectRepository.findByProjectIdAndDeletedYn(projectId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
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
            item.getItemStatus()
        );
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
