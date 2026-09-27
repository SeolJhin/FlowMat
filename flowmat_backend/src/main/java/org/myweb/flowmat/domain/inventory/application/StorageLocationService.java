package org.myweb.flowmat.domain.inventory.application;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.api.dto.request.StorageLocationCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.request.StorageLocationUpdateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.StorageLocationResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.StorageLocation;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.StorageLocationRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The places a project keeps stock (docs/domain/storage-location.md, benchmark FM-WMS-001): sites, warehouses, zones,
 * locations and bins as a tree, each inside a place of an outer kind. A project that lists no places keeps free-text
 * stock locations; once it lists any, new stock goes only to an active listed place, spelled as listed.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StorageLocationService {

    /** From the outermost kind to the innermost; a place sits only inside a kind earlier in this list. */
    public static final List<String> TYPES = List.of("site", "warehouse", "zone", "location", "bin");
    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";
    private static final Comparator<List<String>> LINEAGE_ORDER = (left, right) -> {
        for (int index = 0; index < Math.min(left.size(), right.size()); index++) {
            int order = left.get(index).compareToIgnoreCase(right.get(index));
            if (order != 0) {
                return order;
            }
        }
        return Integer.compare(left.size(), right.size());
    };

    private final StorageLocationRepository storageLocationRepository;
    private final InventoryRepository inventoryRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    /** Every place of the project, each after the place it sits in. */
    public List<StorageLocationResponse> list(String projectId) {
        String id = required(projectId, "projectId");
        projectAccessService.requireProjectReadAccess(id);
        List<StorageLocation> all = storageLocationRepository.findAllByProjectIdAndDeletedYn(id, NOT_DELETED);
        Map<String, StorageLocation> byId = all.stream()
            .collect(Collectors.toMap(StorageLocation::getLocationId, Function.identity()));
        Map<String, long[]> held = new HashMap<>();
        for (Object[] row : inventoryRepository.summarizeHeldStockByLocation(id)) {
            held.put((String) row[0], new long[] {((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        record Entry(StorageLocation location, List<String> lineage) {
        }
        return all.stream()
            .map(location -> new Entry(location, lineage(location, byId)))
            .sorted(Comparator.comparing(Entry::lineage, LINEAGE_ORDER))
            .map(entry -> toResponse(entry.location(), entry.lineage(), held.get(key(entry.location().getLocationCode()))))
            .toList();
    }

    @Transactional
    public StorageLocationResponse create(StorageLocationCreateRequest request) {
        String projectId = required(request.projectId(), "projectId");
        projectAccessService.requireProjectWriteAccess(projectId);
        String code = code(request.locationCode());
        String type = type(request.locationType());
        requireFreeCode(projectId, code, null);
        StorageLocation parent = newParent(projectId, request.parentLocationId(), null);
        if (parent != null) {
            requireInside(type, parent);
        }
        StorageLocation location = new StorageLocation();
        location.setLocationId(idGenerator.generate());
        location.setProjectId(projectId);
        location.setParentLocationId(parent == null ? null : parent.getLocationId());
        location.setLocationCode(code);
        location.setLocationName(text(request.locationName()));
        location.setLocationType(type);
        location.setActiveYn("Y");
        location.setNote(text(request.note()));
        location.setDeletedYn(NOT_DELETED);
        location.setCreatedBy(projectAccessService.requireCurrentUserId());
        return single(storageLocationRepository.saveAndFlush(location));
    }

    @Transactional
    public StorageLocationResponse update(String locationId, StorageLocationUpdateRequest request) {
        StorageLocation location = findLive(locationId);
        String projectId = location.getProjectId();
        projectAccessService.requireProjectWriteAccess(projectId);
        List<StorageLocation> children = storageLocationRepository
            .findAllByParentLocationIdAndDeletedYn(location.getLocationId(), NOT_DELETED);

        if (request.locationCode() != null) {
            String code = code(request.locationCode());
            if (!code.equalsIgnoreCase(location.getLocationCode())) {
                requireFreeCode(projectId, code, location.getLocationId());
                // Stock records keep the code as text, so renaming would leave their stock at an unlisted place.
                requireNoHeldStock(location, "change its code");
            }
            location.setLocationCode(code);
        }
        String type = request.locationType() == null ? location.getLocationType() : type(request.locationType());
        StorageLocation parent;
        String requestedParent = trimToNull(request.parentLocationId());
        if (Boolean.TRUE.equals(request.clearParent())) {
            parent = null;
        } else if (requestedParent != null && !requestedParent.equals(location.getParentLocationId())) {
            parent = newParent(projectId, requestedParent, location.getLocationId());
        } else {
            parent = location.getParentLocationId() == null ? null : findLive(location.getParentLocationId());
        }
        // Each place sits inside an outer kind, so checking both neighbours also rules out moving a place into itself.
        if (parent != null) {
            requireInside(type, parent);
        }
        for (StorageLocation child : children) {
            requireInside(child.getLocationType(), type, location.getLocationCode());
        }
        location.setLocationType(type);
        location.setParentLocationId(parent == null ? null : parent.getLocationId());
        if (request.locationName() != null) {
            location.setLocationName(text(request.locationName()));
        }
        if (request.note() != null) {
            location.setNote(text(request.note()));
        }
        if (Boolean.FALSE.equals(request.active()) && active(location)) {
            requireNoHeldStock(location, "deactivate it");
            children.stream().filter(StorageLocationService::active).findFirst().ifPresent(child -> {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "Deactivate the places inside " + location.getLocationCode() + " first, such as " + child.getLocationCode() + ".");
            });
            location.setActiveYn("N");
        } else if (Boolean.TRUE.equals(request.active()) && !active(location)) {
            if (parent != null && !active(parent)) {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "Location " + parent.getLocationCode() + " is inactive; activate it first.");
            }
            location.setActiveYn("Y");
        }
        location.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return single(storageLocationRepository.saveAndFlush(location));
    }

    @Transactional
    public void delete(String locationId) {
        StorageLocation location = findLive(locationId);
        projectAccessService.requireProjectWriteAccess(location.getProjectId());
        if (storageLocationRepository.existsByParentLocationIdAndDeletedYn(location.getLocationId(), NOT_DELETED)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Delete or move the places inside " + location.getLocationCode() + " first.");
        }
        requireNoHeldStock(location, "delete it");
        location.setDeletedYn(DELETED);
        location.setUpdatedBy(projectAccessService.requireCurrentUserId());
        storageLocationRepository.save(location);
    }

    /**
     * Lists, as top-level locations, the places the project's stock records already name but the list does not, so
     * starting a list does not leave existing stock at unlisted places. Returns the places added.
     */
    @Transactional
    public List<StorageLocationResponse> adoptUsedLocations(String projectId) {
        String id = required(projectId, "projectId");
        projectAccessService.requireProjectWriteAccess(id);
        LocationCheck check = locationCheck(id);
        Map<String, String> missing = new LinkedHashMap<>();
        for (String used : inventoryRepository.findUsedLocations(id)) {
            String code = trimToNull(used);
            if (code != null && !check.byCode().containsKey(key(code))) {
                missing.putIfAbsent(key(code), code);
            }
        }
        String actor = projectAccessService.requireCurrentUserId();
        List<StorageLocation> added = new ArrayList<>();
        for (String code : missing.values()) {
            StorageLocation location = new StorageLocation();
            location.setLocationId(idGenerator.generate());
            location.setProjectId(id);
            location.setLocationCode(code);
            location.setLocationType("location");
            location.setActiveYn("Y");
            location.setDeletedYn(NOT_DELETED);
            location.setCreatedBy(actor);
            added.add(location);
        }
        storageLocationRepository.saveAllAndFlush(added);
        return added.stream().map(this::single).toList();
    }

    /** How new stock is placed in a project; load it once and ask it for each place. */
    public LocationCheck locationCheck(String projectId) {
        Map<String, StorageLocation> byCode = new HashMap<>();
        for (StorageLocation location : storageLocationRepository.findAllByProjectIdAndDeletedYn(projectId, NOT_DELETED)) {
            byCode.put(key(location.getLocationCode()), location);
        }
        return new LocationCheck(!byCode.isEmpty(), byCode);
    }

    /** The place to record for new stock at {@code location}; see {@link LocationCheck#resolve(String)}. */
    public String resolveForStock(String projectId, String location) {
        String code = trimToNull(location);
        return code == null ? null : locationCheck(projectId).resolve(code);
    }

    /**
     * @param listed whether the project lists any place; without a list, stock locations are free text
     * @param byCode listed places by lower-cased code
     */
    public record LocationCheck(boolean listed, Map<String, StorageLocation> byCode) {

        public LocationCheck {
            byCode = Map.copyOf(byCode);
        }

        /**
         * Blank is no place. Without a list, the text as typed; with one, the listed code as spelled in the list. A place
         * missing from the list is refused, and so is an inactive one.
         */
        public String resolve(String location) {
            String code = trimToNull(location);
            if (code == null || !listed) {
                return code;
            }
            StorageLocation found = byCode.get(key(code));
            if (found == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Location " + code + " is not in this project's location list. Add it under Inventory > Locations first.");
            }
            if (!active(found)) {
                throw new BusinessException(ErrorCode.CONFLICT, "Location " + found.getLocationCode() + " is inactive.");
            }
            return found.getLocationCode();
        }
    }

    private StorageLocation newParent(String projectId, String parentLocationId, String selfId) {
        String id = trimToNull(parentLocationId);
        if (id == null) {
            return null;
        }
        if (id.equals(selfId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A place cannot be inside itself.");
        }
        StorageLocation parent = storageLocationRepository.findByLocationIdAndDeletedYn(id, NOT_DELETED)
            .filter(found -> found.getProjectId().equals(projectId))
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The parent place is not in this project."));
        if (!active(parent)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Location " + parent.getLocationCode() + " is inactive; activate it or pick another parent.");
        }
        return parent;
    }

    private static void requireInside(String type, StorageLocation parent) {
        requireInside(type, parent.getLocationType(), parent.getLocationCode());
    }

    private static void requireInside(String type, String parentType, String parentCode) {
        if (TYPES.indexOf(parentType) >= TYPES.indexOf(type)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "A " + type + " cannot be inside " + parentCode + " (a " + parentType
                    + "); places nest as site > warehouse > zone > location > bin.");
        }
    }

    private void requireFreeCode(String projectId, String code, String selfId) {
        storageLocationRepository.findLiveByCode(projectId, code)
            .filter(other -> !other.getLocationId().equals(selfId))
            .ifPresent(other -> {
                throw new BusinessException(ErrorCode.CONFLICT, "Location code " + other.getLocationCode()
                    + " is already used in this project.");
            });
    }

    private void requireNoHeldStock(StorageLocation location, String action) {
        long records = inventoryRepository.countHeldStockAtLocation(location.getProjectId(), location.getLocationCode());
        if (records > 0) {
            throw new BusinessException(ErrorCode.CONFLICT, location.getLocationCode() + " still holds stock in " + records
                + (records == 1 ? " record" : " records") + ". Move the stock out before you " + action + ".");
        }
    }

    private StorageLocation findLive(String locationId) {
        return storageLocationRepository.findByLocationIdAndDeletedYn(required(locationId, "locationId"), NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private StorageLocationResponse single(StorageLocation location) {
        Map<String, StorageLocation> byId = storageLocationRepository
            .findAllByProjectIdAndDeletedYn(location.getProjectId(), NOT_DELETED).stream()
            .collect(Collectors.toMap(StorageLocation::getLocationId, Function.identity()));
        byId.put(location.getLocationId(), location);
        long records = inventoryRepository.countHeldStockAtLocation(location.getProjectId(), location.getLocationCode());
        long items = inventoryRepository.countHeldItemsAtLocation(location.getProjectId(), location.getLocationCode());
        return toResponse(location, lineage(location, byId), new long[] {records, items});
    }

    private static List<String> lineage(StorageLocation location, Map<String, StorageLocation> byId) {
        List<String> codes = new ArrayList<>();
        StorageLocation current = location;
        // The kind order bounds the depth; the bound also stops a corrupted parent loop.
        while (current != null && codes.size() < TYPES.size()) {
            codes.add(0, current.getLocationCode());
            current = current.getParentLocationId() == null ? null : byId.get(current.getParentLocationId());
        }
        return codes;
    }

    private static StorageLocationResponse toResponse(StorageLocation location, List<String> lineage, long[] held) {
        return new StorageLocationResponse(
            location.getLocationId(),
            location.getProjectId(),
            location.getParentLocationId(),
            location.getLocationCode(),
            location.getLocationName(),
            location.getLocationType(),
            active(location),
            location.getNote(),
            String.join(" / ", lineage),
            lineage.size() - 1,
            held == null ? 0 : held[0],
            held == null ? 0 : held[1]
        );
    }

    private static boolean active(StorageLocation location) {
        return "Y".equals(location.getActiveYn());
    }

    private static String code(String value) {
        String code = trimToNull(value);
        if (code == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "locationCode is required.");
        }
        if (code.length() > 100) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "locationCode is longer than 100 characters.");
        }
        return code;
    }

    private static String type(String value) {
        String type = trimToNull(value) == null ? null : value.trim().toLowerCase(Locale.ROOT);
        if (type == null || !TYPES.contains(type)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "locationType must be one of " + String.join(", ", TYPES) + ".");
        }
        return type;
    }

    private static String required(String value, String field) {
        String text = trimToNull(value);
        if (text == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, field + " is required.");
        }
        return text;
    }

    private static String text(String value) {
        return trimToNull(value);
    }

    static String key(String code) {
        return code.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
