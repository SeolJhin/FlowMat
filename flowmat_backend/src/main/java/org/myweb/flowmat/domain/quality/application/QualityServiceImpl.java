package org.myweb.flowmat.domain.quality.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.application.InventoryCommandService;
import org.myweb.flowmat.domain.inventory.application.InventoryMovement;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.inventory.domain.enums.LotStatus;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.quality.api.dto.request.DefectCreateRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.DefectResolveRequest;
import org.myweb.flowmat.domain.quality.api.dto.request.QualityInspectionCreateRequest;
import org.myweb.flowmat.domain.quality.api.dto.response.DefectResponse;
import org.myweb.flowmat.domain.quality.api.dto.response.QualityInspectionResponse;
import org.myweb.flowmat.domain.quality.domain.entity.DefectLog;
import org.myweb.flowmat.domain.quality.domain.entity.QualityInspection;
import org.myweb.flowmat.domain.quality.repository.DefectLogRepository;
import org.myweb.flowmat.domain.quality.repository.QualityInspectionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inspections and defects (docs/domain/quality-inspection.md). Both are records only: an inspection moves stock only
 * when a failed one quarantines its LOT, and that goes through the stock command path like any quarantine.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QualityServiceImpl implements QualityService {

    private static final String NOT_DELETED = "N";
    private static final Set<String> SEVERITIES = Set.of("minor", "major", "critical");

    private final QualityInspectionRepository inspectionRepository;
    private final DefectLogRepository defectLogRepository;
    private final ProjectAccessService projectAccessService;
    private final ProductionRunRepository productionRunRepository;
    private final ProductionRunItemRepository productionRunItemRepository;
    private final LotMasterRepository lotMasterRepository;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryCommandService inventoryCommandService;
    private final IdGenerator idGenerator;

    @Override
    public List<QualityInspectionResponse> listInspections(String projectId, String productionRunId, String lotId, String itemId) {
        projectAccessService.requireProjectReadAccess(projectId);
        String runFilter = trimToNull(productionRunId);
        String lotFilter = trimToNull(lotId);
        List<QualityInspection> found = runFilter != null
            ? inspectionRepository.findAllByProductionRunIdOrderByInspectedAtDesc(runFilter)
            : lotFilter != null
                ? inspectionRepository.findAllByLotIdOrderByInspectedAtDesc(lotFilter)
                : inspectionRepository.findAllByProjectIdOrderByInspectedAtDesc(projectId);
        List<QualityInspection> inspections = found.stream()
            .filter(inspection -> projectId.equals(inspection.getProjectId()))
            .filter(inspection -> lotFilter == null || lotFilter.equals(inspection.getLotId()))
            .filter(inspection -> trimToNull(itemId) == null || itemId.trim().equals(inspection.getItemId()))
            .toList();
        Names names = names(
            inspections.stream().map(QualityInspection::getProductionRunId),
            inspections.stream().map(QualityInspection::getItemId),
            inspections.stream().map(QualityInspection::getLotId));
        return inspections.stream().map(inspection -> toResponse(inspection, names)).toList();
    }

    @Override
    @Transactional
    public QualityInspectionResponse recordInspection(QualityInspectionCreateRequest request) {
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);
        String actor = projectAccessService.requireCurrentUserId();
        Target target = resolveTarget(projectId, request.productionRunId(), request.lotId(), request.itemId());
        if (target.run() == null && target.lot() == null && target.item() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Pick what was inspected: a LOT, a run or an item.");
        }
        String result = decideResult(request);
        boolean quarantine = Boolean.TRUE.equals(request.quarantineLot());
        if (quarantine && !QualityInspection.FAIL.equals(result)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Only a failed inspection quarantines its LOT.");
        }
        if (quarantine && target.lot() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Pick the LOT to quarantine.");
        }

        QualityInspection inspection = new QualityInspection();
        inspection.setInspectionId(idGenerator.generate());
        inspection.setProjectId(projectId);
        inspection.setProductionRunId(target.run() == null ? null : target.run().getProductionRunId());
        inspection.setItemId(target.item() == null ? null : target.item().getItemId());
        inspection.setLotId(target.lot() == null ? null : target.lot().getLotId());
        inspection.setInspectionType(request.inspectionType().trim());
        inspection.setResultStatus(result);
        inspection.setMeasuredValue(request.measuredValue());
        inspection.setStandardMin(request.standardMin());
        inspection.setStandardMax(request.standardMax());
        inspection.setUnit(trimToNull(request.unit()));
        inspection.setNote(trimToNull(request.note()));
        inspection.setInspectedBy(actor);
        inspection.setInspectedAt(OffsetDateTime.now());
        QualityInspection saved = inspectionRepository.saveAndFlush(inspection);
        if (quarantine) {
            quarantine(target.lot(), saved, actor);
        }
        // Read the names after the quarantine so the LOT status in the answer is the new one.
        return toResponse(saved, names(
            Stream.of(saved.getProductionRunId()), Stream.of(saved.getItemId()), Stream.of(saved.getLotId())));
    }

    @Override
    public List<DefectResponse> listDefects(String projectId, String productionRunId, String lotId, String itemId, boolean openOnly) {
        projectAccessService.requireProjectReadAccess(projectId);
        String runFilter = trimToNull(productionRunId);
        String lotFilter = trimToNull(lotId);
        List<DefectLog> found = runFilter != null
            ? defectLogRepository.findAllByProductionRunIdOrderByLoggedAtDesc(runFilter)
            : lotFilter != null
                ? defectLogRepository.findAllByLotIdOrderByLoggedAtDesc(lotFilter)
                : defectLogRepository.findAllByProjectIdOrderByLoggedAtDesc(projectId);
        List<DefectLog> defects = found.stream()
            .filter(defect -> projectId.equals(defect.getProjectId()))
            .filter(defect -> lotFilter == null || lotFilter.equals(defect.getLotId()))
            .filter(defect -> trimToNull(itemId) == null || itemId.trim().equals(defect.getItemId()))
            .filter(defect -> !openOnly || !defect.isResolved())
            .toList();
        Names names = names(
            defects.stream().map(DefectLog::getProductionRunId),
            defects.stream().map(DefectLog::getItemId),
            defects.stream().map(DefectLog::getLotId));
        return defects.stream().map(defect -> toResponse(defect, names)).toList();
    }

    @Override
    @Transactional
    public DefectResponse logDefect(DefectCreateRequest request) {
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);
        String actor = projectAccessService.requireCurrentUserId();
        QualityInspection inspection = null;
        if (trimToNull(request.inspectionId()) != null) {
            inspection = inspectionRepository.findById(request.inspectionId().trim())
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The inspection was not found in this project."));
        }
        Target target = resolveTarget(projectId,
            inherit("run", request.productionRunId(), inspection == null ? null : inspection.getProductionRunId()),
            inherit("LOT", request.lotId(), inspection == null ? null : inspection.getLotId()),
            inherit("item", request.itemId(), inspection == null ? null : inspection.getItemId()));
        if (target.item() == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Pick the item or LOT the defect was found in.");
        }
        if (request.quantity() == null || request.quantity().signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The defective quantity must be more than 0.");
        }
        String severity = trimToNull(request.severity()) == null ? "minor" : request.severity().trim().toLowerCase(Locale.ROOT);
        if (!SEVERITIES.contains(severity)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Severity must be minor, major or critical.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        DefectLog defect = new DefectLog();
        defect.setDefectLogId(idGenerator.generate());
        defect.setProjectId(projectId);
        defect.setInspectionId(inspection == null ? null : inspection.getInspectionId());
        defect.setProductionRunId(target.run() == null ? null : target.run().getProductionRunId());
        defect.setItemId(target.item().getItemId());
        defect.setLotId(target.lot() == null ? null : target.lot().getLotId());
        defect.setDefectType(request.defectType().trim());
        defect.setQuantity(request.quantity());
        defect.setSeverity(severity);
        defect.setReason(trimToNull(request.reason()));
        defect.setResolvedYn("N");
        defect.setDetectedAt(now);
        defect.setLoggedAt(now);
        defect.setLoggedBy(actor);
        DefectLog saved = defectLogRepository.save(defect);
        return toResponse(saved, names(
            Stream.of(saved.getProductionRunId()), Stream.of(saved.getItemId()), Stream.of(saved.getLotId())));
    }

    @Override
    @Transactional
    public DefectResponse resolveDefect(String defectLogId, DefectResolveRequest request) {
        DefectLog defect = defectLogRepository.findForUpdate(defectLogId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectWriteAccess(defect.getProjectId());
        if (defect.isResolved()) {
            throw new BusinessException(ErrorCode.CONFLICT, "This defect was already resolved.");
        }
        String actionTaken = trimToNull(request.actionTaken());
        if (actionTaken == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Say what was done about the defect.");
        }
        String scrapInventoryId = trimToNull(request.scrapInventoryId());
        if ((scrapInventoryId == null) != (request.scrapQuantity() == null)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "To scrap stock, give both the stock record and the quantity.");
        }
        if (scrapInventoryId != null) {
            actionTaken = actionTaken + " (" + scrap(defect, scrapInventoryId, request.scrapQuantity()) + ")";
        }
        defect.setActionTaken(actionTaken);
        defect.setResolvedYn("Y");
        defect.setResolvedAt(OffsetDateTime.now());
        defect.setResolvedBy(projectAccessService.requireCurrentUserId());
        DefectLog saved = defectLogRepository.save(defect);
        return toResponse(saved, names(
            Stream.of(saved.getProductionRunId()), Stream.of(saved.getItemId()), Stream.of(saved.getLotId())));
    }

    /**
     * Writes defective stock off: a decreasing adjustment that points at the defect. An adjustment, not an issue, so that
     * quarantined stock (where defects usually sit) can be scrapped. Returns what was done, for the defect's action text.
     */
    private String scrap(DefectLog defect, String inventoryId, BigDecimal quantity) {
        if (quantity.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Scrap more than 0.");
        }
        Inventory row = inventoryRepository.findByInventoryIdAndDeletedYn(inventoryId, NOT_DELETED)
            .filter(found -> defect.getProjectId().equals(found.getProjectId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The stock record to scrap was not found in this project."));
        if (!defect.getItemId().equals(row.getItemId())
            || (defect.getLotId() != null && !defect.getLotId().equals(row.getLotId()))) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Scrap from stock of the defective item"
                + (defect.getLotId() != null ? " and LOT" : "") + ".");
        }
        inventoryCommandService.apply(new InventoryMovement(
            row.getInventoryId(),
            InventoryTransactionType.ADJUSTMENT,
            quantity.negate(),
            BigDecimal.ZERO,
            "defect_log",
            defect.getDefectLogId(),
            "Scrapped: " + defect.getDefectType(),
            null,
            projectAccessService.requireCurrentUserId()
        ));
        return "scrapped " + plain(quantity) + " from " + (row.getLocation() == null ? "no location" : row.getLocation());
    }

    // ---- target ----

    private record Target(ProductionRun run, LotMaster lot, Item item) {
    }

    /** Checks that the run, LOT and item are in the project and fit together; the item follows from the LOT. */
    private Target resolveTarget(String projectId, String productionRunId, String lotId, String itemId) {
        ProductionRun run = null;
        if (trimToNull(productionRunId) != null) {
            run = productionRunRepository.findByProductionRunIdAndDeletedYn(productionRunId.trim(), NOT_DELETED)
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The run was not found in this project."));
        }
        LotMaster lot = null;
        if (trimToNull(lotId) != null) {
            lot = lotMasterRepository.findById(lotId.trim())
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The LOT was not found in this project."));
        }
        String requestedItemId = trimToNull(itemId);
        if (lot != null && requestedItemId != null && !requestedItemId.equals(lot.getItemId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "LOT " + lot.getLotNo() + " is a LOT of a different item.");
        }
        String effectiveItemId = requestedItemId != null ? requestedItemId : lot == null ? null : lot.getItemId();
        Item item = null;
        if (effectiveItemId != null) {
            item = itemRepository.findByItemIdAndDeletedYn(effectiveItemId, NOT_DELETED)
                .filter(found -> projectId.equals(found.getProjectId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "The item was not found in this project."));
        }
        if (run != null && lot != null && !lotInRun(run, lot)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "LOT " + lot.getLotNo() + " was not used or made by run " + run.getRunNumber() + ".");
        }
        if (run != null && lot == null && item != null && !itemInRun(run, item)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Item " + item.getItemCode() + " was not used or made by run " + run.getRunNumber() + ".");
        }
        return new Target(run, lot, item);
    }

    private boolean lotInRun(ProductionRun run, LotMaster lot) {
        return run.getProductionRunId().equals(lot.getProductionRunId())
            || productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(run.getProductionRunId()).stream()
                .anyMatch(recording -> !recording.isCancelled() && lot.getLotId().equals(recording.getLotId()));
    }

    private boolean itemInRun(ProductionRun run, Item item) {
        return item.getItemId().equals(run.getTargetItemId())
            || productionRunItemRepository.findAllByProductionRunIdOrderByProductionRunItemIdAsc(run.getProductionRunId()).stream()
                .anyMatch(recording -> !recording.isCancelled() && item.getItemId().equals(recording.getItemId()));
    }

    /** A defect found by an inspection is about what that inspection looked at; a different value is a mistake. */
    private static String inherit(String what, String requested, String fromInspection) {
        String value = trimToNull(requested);
        if (value != null && fromInspection != null && !value.equals(fromInspection)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The " + what + " differs from the inspection's " + what + ".");
        }
        return value != null ? value : fromInspection;
    }

    // ---- result and quarantine ----

    /** A measured value with a limit decides the result; otherwise the inspector gives it. */
    private static String decideResult(QualityInspectionCreateRequest request) {
        BigDecimal value = request.measuredValue();
        BigDecimal min = request.standardMin();
        BigDecimal max = request.standardMax();
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "The lower limit " + plain(min) + " is above the upper limit " + plain(max) + ".");
        }
        String requested = trimToNull(request.result()) == null ? null : request.result().trim().toLowerCase(Locale.ROOT);
        if (requested != null && !QualityInspection.PASS.equals(requested) && !QualityInspection.FAIL.equals(requested)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The result must be pass or fail.");
        }
        if (value != null && (min != null || max != null)) {
            boolean within = (min == null || value.compareTo(min) >= 0) && (max == null || value.compareTo(max) <= 0);
            String measured = within ? QualityInspection.PASS : QualityInspection.FAIL;
            if (requested != null && !requested.equals(measured)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The measured value " + plain(value)
                    + (within ? " is within" : " is outside") + " the limits, so the result is " + measured + ".");
            }
            return measured;
        }
        if (requested == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give the result (pass or fail), or a measured value with a limit.");
        }
        return requested;
    }

    /** Quarantines the whole LOT through the stock command path, pointing the movement at the inspection. */
    private void quarantine(LotMaster lot, QualityInspection inspection, String actor) {
        if (LotStatus.QUARANTINED.code().equals(lot.getLotStatus())) {
            return;
        }
        if (LotStatus.CLOSED.code().equals(lot.getLotStatus())) {
            throw new BusinessException(ErrorCode.CONFLICT, "LOT " + lot.getLotNo() + " is closed, so it cannot be quarantined.");
        }
        List<Inventory> rows = inventoryRepository.findAllByLotIdAndDeletedYn(lot.getLotId(), NOT_DELETED);
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.CONFLICT, "LOT " + lot.getLotNo() + " has no stock record to quarantine.");
        }
        inventoryCommandService.apply(new InventoryMovement(
            rows.get(0).getInventoryId(),
            InventoryTransactionType.QUARANTINE,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            "quality_inspection",
            inspection.getInspectionId(),
            "Failed inspection: " + inspection.getInspectionType(),
            null,
            actor
        ));
    }

    // ---- responses ----

    private record Names(
        Map<String, ProductionRun> runs,
        Map<String, Item> items,
        Map<String, LotMaster> lots,
        Map<String, String> unitCodes
    ) {
    }

    private Names names(Stream<String> runIds, Stream<String> itemIds, Stream<String> lotIds) {
        Map<String, ProductionRun> runs = byId(productionRunRepository.findAllById(distinct(runIds)), ProductionRun::getProductionRunId);
        Map<String, Item> items = byId(itemRepository.findAllById(distinct(itemIds)), Item::getItemId);
        Map<String, LotMaster> lots = byId(lotMasterRepository.findAllById(distinct(lotIds)), LotMaster::getLotId);
        Map<String, String> unitCodes = StreamSupport.stream(
                unitMasterRepository.findAllById(distinct(items.values().stream().map(Item::getUnitId))).spliterator(), false)
            .collect(Collectors.toMap(UnitMaster::getUnitId, UnitMaster::getUnitCode, (first, second) -> first));
        return new Names(runs, items, lots, unitCodes);
    }

    private QualityInspectionResponse toResponse(QualityInspection inspection, Names names) {
        ProductionRun run = names.runs().get(inspection.getProductionRunId());
        Item item = names.items().get(inspection.getItemId());
        LotMaster lot = names.lots().get(inspection.getLotId());
        return new QualityInspectionResponse(
            inspection.getInspectionId(),
            inspection.getProjectId(),
            inspection.getProductionRunId(),
            run == null ? null : run.getRunNumber(),
            inspection.getItemId(),
            item == null ? null : item.getItemCode(),
            item == null ? null : item.getItemName(),
            inspection.getLotId(),
            lot == null ? null : lot.getLotNo(),
            lot == null ? null : lot.getLotStatus(),
            inspection.getInspectionType(),
            inspection.getResultStatus(),
            inspection.getMeasuredValue(),
            inspection.getStandardMin(),
            inspection.getStandardMax(),
            inspection.getUnit(),
            inspection.getNote(),
            inspection.getInspectedBy(),
            inspection.getInspectedAt()
        );
    }

    private DefectResponse toResponse(DefectLog defect, Names names) {
        ProductionRun run = names.runs().get(defect.getProductionRunId());
        Item item = names.items().get(defect.getItemId());
        LotMaster lot = names.lots().get(defect.getLotId());
        return new DefectResponse(
            defect.getDefectLogId(),
            defect.getProjectId(),
            defect.getInspectionId(),
            defect.getProductionRunId(),
            run == null ? null : run.getRunNumber(),
            defect.getItemId(),
            item == null ? null : item.getItemCode(),
            item == null ? null : item.getItemName(),
            defect.getLotId(),
            lot == null ? null : lot.getLotNo(),
            defect.getDefectType(),
            defect.getQuantity(),
            item == null ? null : names.unitCodes().get(item.getUnitId()),
            defect.getSeverity(),
            defect.getReason(),
            defect.isResolved(),
            defect.getActionTaken(),
            defect.getLoggedBy(),
            defect.getLoggedAt(),
            defect.getResolvedBy(),
            defect.getResolvedAt()
        );
    }

    private static <T> Map<String, T> byId(Iterable<T> found, Function<T, String> id) {
        return StreamSupport.stream(found.spliterator(), false)
            .collect(Collectors.toMap(id, Function.identity(), (first, second) -> first));
    }

    private static Collection<String> distinct(Stream<String> ids) {
        return ids.filter(Objects::nonNull).collect(Collectors.toSet());
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
