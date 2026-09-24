package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.production.api.dto.request.RunCorrectionCreateRequest;
import org.myweb.flowmat.domain.production.api.dto.request.RunCorrectionLineRequest;
import org.myweb.flowmat.domain.production.api.dto.response.RunCorrectionResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunCorrection;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunCorrectionLine;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.myweb.flowmat.domain.production.repository.ProductionRunCorrectionLineRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunCorrectionRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunItemRepository;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Corrections of finished runs (docs/domain/production-run-correction.md): requested with a reason, approved by the
 * project owner, and applied in the approving transaction. Recordings are voided and added, never edited.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionRunCorrectionServiceImpl implements ProductionRunCorrectionService {

    private static final String NOT_DELETED = "N";
    private static final String FINISHED = "finished";

    private final ProductionRunRepository productionRunRepository;
    private final ProductionRunItemRepository productionRunItemRepository;
    private final ProductionRunCorrectionRepository correctionRepository;
    private final ProductionRunCorrectionLineRepository correctionLineRepository;
    private final ProductionRunServiceImpl productionRunService;
    private final ProjectAccessService projectAccessService;
    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final LotMasterRepository lotMasterRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<RunCorrectionResponse> listCorrections(String productionRunId) {
        ProductionRun run = productionRunRepository.findByProductionRunIdAndDeletedYn(productionRunId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectReadAccess(run.getProjectId());
        List<ProductionRunCorrection> corrections = correctionRepository.findAllByProductionRunIdOrderByCorrectionNoDesc(productionRunId);
        if (corrections.isEmpty()) {
            return List.of();
        }
        Map<String, List<ProductionRunCorrectionLine>> linesByCorrection = correctionLineRepository
            .findAllByProductionRunCorrectionIdInOrderByLineNoAsc(
                corrections.stream().map(ProductionRunCorrection::getProductionRunCorrectionId).toList())
            .stream()
            .collect(Collectors.groupingBy(ProductionRunCorrectionLine::getProductionRunCorrectionId, LinkedHashMap::new,
                Collectors.toList()));
        return corrections.stream()
            .map(correction -> toResponse(correction,
                linesByCorrection.getOrDefault(correction.getProductionRunCorrectionId(), List.of())))
            .toList();
    }

    @Override
    @Transactional
    public RunCorrectionResponse requestCorrection(String productionRunId, RunCorrectionCreateRequest request) {
        ProductionRun run = lockRun(productionRunId);
        projectAccessService.requireProjectWriteAccess(run.getProjectId());
        requireFinished(run);
        if (correctionRepository.existsByProductionRunIdAndStatus(productionRunId, ProductionRunCorrection.PENDING_APPROVAL)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "A correction of run " + run.getRunNumber() + " is already waiting for approval. Approve or reject it first.");
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a reason for the correction.");
        }
        List<ProductionRunCorrectionLine> lines = validateLines(run, request.lines());

        ProductionRunCorrection correction = new ProductionRunCorrection();
        correction.setProductionRunCorrectionId(idGenerator.generate());
        correction.setProjectId(run.getProjectId());
        correction.setProductionRunId(run.getProductionRunId());
        correction.setCorrectionNo(correctionRepository.findTopByProductionRunIdOrderByCorrectionNoDesc(productionRunId)
            .map(latest -> latest.getCorrectionNo() + 1)
            .orElse(1));
        correction.setStatus(ProductionRunCorrection.PENDING_APPROVAL);
        correction.setReason(request.reason().trim());
        correction.setRequestedBy(projectAccessService.requireCurrentUserId());
        correction.setRequestedAt(OffsetDateTime.now());
        ProductionRunCorrection saved = correctionRepository.save(correction);
        for (ProductionRunCorrectionLine line : lines) {
            line.setProductionRunCorrectionId(saved.getProductionRunCorrectionId());
        }
        return toResponse(saved, correctionLineRepository.saveAll(lines));
    }

    @Override
    @Transactional
    public RunCorrectionResponse approveCorrection(String productionRunId, String correctionId) {
        ProductionRun run = lockRun(productionRunId);
        projectAccessService.requireProjectOwnerAccess(run.getProjectId());
        ProductionRunCorrection correction = findPending(run, correctionId);
        requireFinished(run);
        String actor = projectAccessService.requireCurrentUserId();
        int no = correction.getCorrectionNo();
        String reason = correction.getReason();
        List<ProductionRunCorrectionLine> lines =
            correctionLineRepository.findAllByProductionRunCorrectionIdOrderByLineNoAsc(correctionId);

        // Void first: produced stock that was already used is refused before anything moves.
        List<ProductionRunItem> toVoid = new ArrayList<>();
        Set<String> formerOutputLots = new HashSet<>();
        for (ProductionRunCorrectionLine line : lines) {
            if (ProductionRunCorrectionLine.VOID_ITEM.equals(line.getLineKind())) {
                ProductionRunItem item = findVoidable(run, line.getTargetRunItemId());
                if ("output".equals(item.getDirection())) {
                    requireOutputUnused(run, item);
                    if (item.getLotId() != null) {
                        formerOutputLots.add(item.getLotId());
                    }
                }
                toVoid.add(item);
            }
        }
        for (ProductionRunItem item : toVoid) {
            productionRunService.voidForCorrection(run, item, correctionId, no, reason, actor);
        }
        for (ProductionRunCorrectionLine line : lines) {
            if (ProductionRunCorrectionLine.ADD_ITEM.equals(line.getLineKind())) {
                ProductionRunItem created = productionRunService.recordCorrectionItem(run, correctionId, line.getDirection(),
                    line.getItemId(), line.getInventoryId(), line.getQty(), line.getUnit());
                line.setCreatedRunItemId(created.getProductionRunItemId());
            } else if (ProductionRunCorrectionLine.SET_OUTPUT_QTY.equals(line.getLineKind())) {
                BigDecimal current = run.getActualOutputQty();
                if (!sameQuantity(current, line.getBeforeQty())) {
                    throw new BusinessException(ErrorCode.CONFLICT, "The run's output changed from " + plain(line.getBeforeQty())
                        + " to " + plain(current) + " since this correction was requested. Reject it and request a new one.");
                }
                run.setActualOutputQty(line.getAfterQty());
                productionRunRepository.save(run);
            }
        }
        productionRunService.rebuildLotGenealogy(run, formerOutputLots);

        OffsetDateTime now = OffsetDateTime.now();
        correction.setStatus(ProductionRunCorrection.APPLIED);
        correction.setDecidedBy(actor);
        correction.setDecidedAt(now);
        correction.setAppliedAt(now);
        return toResponse(correctionRepository.save(correction), correctionLineRepository.saveAll(lines));
    }

    @Override
    @Transactional
    public RunCorrectionResponse rejectCorrection(String productionRunId, String correctionId, String note) {
        ProductionRun run = lockRun(productionRunId);
        projectAccessService.requireProjectOwnerAccess(run.getProjectId());
        ProductionRunCorrection correction = findPending(run, correctionId);
        if (note == null || note.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a reason for rejecting the correction.");
        }
        correction.setStatus(ProductionRunCorrection.REJECTED);
        correction.setDecidedBy(projectAccessService.requireCurrentUserId());
        correction.setDecidedAt(OffsetDateTime.now());
        correction.setDecisionNote(note.trim());
        return toResponse(correctionRepository.save(correction),
            correctionLineRepository.findAllByProductionRunCorrectionIdOrderByLineNoAsc(correctionId));
    }

    private List<ProductionRunCorrectionLine> validateLines(ProductionRun run, List<RunCorrectionLineRequest> requested) {
        if (requested == null || requested.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A correction needs at least one change.");
        }
        List<ProductionRunCorrectionLine> lines = new ArrayList<>();
        Set<String> voided = new HashSet<>();
        boolean outputSet = false;
        int lineNo = 1;
        for (RunCorrectionLineRequest request : requested) {
            String kind = request.kind() == null ? "" : request.kind().trim().toLowerCase();
            ProductionRunCorrectionLine line = new ProductionRunCorrectionLine();
            line.setProductionRunCorrectionLineId(idGenerator.generate());
            line.setLineNo(lineNo++);
            line.setLineKind(kind);
            switch (kind) {
                case ProductionRunCorrectionLine.VOID_ITEM -> {
                    ProductionRunItem item = findVoidable(run, request.targetRunItemId());
                    if (!voided.add(item.getProductionRunItemId())) {
                        throw new BusinessException(ErrorCode.BAD_REQUEST, "The same recording is voided twice.");
                    }
                    line.setTargetRunItemId(item.getProductionRunItemId());
                }
                case ProductionRunCorrectionLine.ADD_ITEM -> {
                    productionRunService.validateCorrectionRecording(run, request.direction(), request.itemId(),
                        request.inventoryId(), request.qty(), request.unit());
                    line.setDirection(request.direction().trim().toLowerCase());
                    line.setItemId(request.itemId().trim());
                    line.setInventoryId(request.inventoryId() == null || request.inventoryId().isBlank()
                        ? null : request.inventoryId().trim());
                    line.setQty(request.qty());
                    line.setUnit(request.unit().trim());
                }
                case ProductionRunCorrectionLine.SET_OUTPUT_QTY -> {
                    if (outputSet) {
                        throw new BusinessException(ErrorCode.BAD_REQUEST, "Set the output quantity once per correction.");
                    }
                    outputSet = true;
                    if (request.afterQty() == null || request.afterQty().signum() < 0) {
                        throw new BusinessException(ErrorCode.BAD_REQUEST, "The corrected output quantity must be 0 or more.");
                    }
                    if (sameQuantity(run.getActualOutputQty(), request.afterQty())) {
                        throw new BusinessException(ErrorCode.BAD_REQUEST,
                            "The run's output is already " + plain(request.afterQty()) + ".");
                    }
                    line.setBeforeQty(run.getActualOutputQty());
                    line.setAfterQty(request.afterQty());
                }
                default -> throw new BusinessException(ErrorCode.BAD_REQUEST,
                    "Unknown correction kind '" + request.kind() + "'. Use void_item, add_item or set_output_qty.");
            }
            lines.add(line);
        }
        return lines;
    }

    /** A recording of this run that stands: not a BOM plan line and not cancelled already. */
    private ProductionRunItem findVoidable(ProductionRun run, String runItemId) {
        if (runItemId == null || runItemId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Choose the recording to void.");
        }
        ProductionRunItem item = productionRunItemRepository.findById(runItemId.trim())
            .filter(found -> found.getProductionRunId().equals(run.getProductionRunId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if ("bom".equals(item.getQuantitySource())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "BOM plan lines are the plan, not a recording; there is nothing to void.");
        }
        if (item.isCancelled()) {
            throw new BusinessException(ErrorCode.CONFLICT, "This recording was already cancelled by " + item.getCancelledBy() + ".");
        }
        return item;
    }

    /**
     * Voiding an output takes its stock back. When that stock was already used, say where it went: later runs have to be
     * corrected first (§9 Q3).
     */
    private void requireOutputUnused(ProductionRun run, ProductionRunItem output) {
        if (output.getInventoryId() == null) {
            return;
        }
        BigDecimal produced = inventoryTransactionRepository
            .findAllByReferenceTypeAndReferenceId("production_run_item", output.getProductionRunItemId()).stream()
            .map(InventoryTransaction::getQuantityDelta)
            .filter(delta -> delta != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Inventory stock = inventoryRepository.findByInventoryIdAndDeletedYn(output.getInventoryId(), NOT_DELETED).orElse(null);
        if (produced.signum() <= 0 || stock == null) {
            return;
        }
        BigDecimal available = zeroIfNull(stock.getQuantity()).subtract(zeroIfNull(stock.getReservedQuantity()));
        if (available.compareTo(produced) >= 0) {
            return;
        }
        String label = output.getLotId() == null
            ? "The stock this run produced"
            : "LOT " + lotMasterRepository.findById(output.getLotId()).map(lot -> lot.getLotNo()).orElse(output.getLotId())
                + " made by this run";
        List<String> laterRuns = output.getLotId() == null ? List.of() : consumingRunNumbers(run, output.getLotId());
        throw new BusinessException(ErrorCode.CONFLICT, label + " was already used"
            + (laterRuns.isEmpty()
                ? " (issued, reserved or moved); bring it back before voiding the output."
                : " by run " + String.join(", ", laterRuns) + "; correct that run first."));
    }

    /** Other runs with a standing input recording of this LOT (genealogy edges need an output too, so they can miss some). */
    private List<String> consumingRunNumbers(ProductionRun run, String lotId) {
        List<String> runIds = productionRunItemRepository.findAllByLotIdAndDirection(lotId, "input").stream()
            .filter(item -> !item.isCancelled() && !item.getProductionRunId().equals(run.getProductionRunId()))
            .map(ProductionRunItem::getProductionRunId)
            .distinct()
            .toList();
        return productionRunRepository.findAllById(runIds).stream()
            .map(ProductionRun::getRunNumber)
            .sorted()
            .toList();
    }

    private ProductionRun lockRun(String productionRunId) {
        return productionRunRepository.findForUpdate(productionRunId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private ProductionRunCorrection findPending(ProductionRun run, String correctionId) {
        ProductionRunCorrection correction = correctionRepository.findById(correctionId)
            .filter(found -> found.getProductionRunId().equals(run.getProductionRunId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!correction.isPending()) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Correction #" + correction.getCorrectionNo() + " is already " + correction.getStatus() + ".");
        }
        return correction;
    }

    private static void requireFinished(ProductionRun run) {
        if (!FINISHED.equalsIgnoreCase(run.getRunStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Only finished runs are corrected. Run " + run.getRunNumber()
                + " is " + run.getRunStatus() + "; cancel its recordings on the run instead.");
        }
    }

    private static boolean sameQuantity(BigDecimal a, BigDecimal b) {
        return zeroIfNull(a).compareTo(zeroIfNull(b)) == 0;
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String plain(BigDecimal value) {
        return zeroIfNull(value).stripTrailingZeros().toPlainString();
    }

    private static RunCorrectionResponse toResponse(ProductionRunCorrection correction, List<ProductionRunCorrectionLine> lines) {
        return new RunCorrectionResponse(
            correction.getProductionRunCorrectionId(),
            correction.getProductionRunId(),
            correction.getCorrectionNo(),
            correction.getStatus(),
            correction.getReason(),
            correction.getRequestedBy(),
            correction.getRequestedAt(),
            correction.getDecidedBy(),
            correction.getDecidedAt(),
            correction.getDecisionNote(),
            correction.getAppliedAt(),
            lines.stream()
                .map(line -> new RunCorrectionResponse.Line(
                    line.getLineNo(),
                    line.getLineKind(),
                    line.getTargetRunItemId(),
                    line.getDirection(),
                    line.getItemId(),
                    line.getInventoryId(),
                    line.getQty(),
                    line.getUnit(),
                    line.getBeforeQty(),
                    line.getAfterQty(),
                    line.getCreatedRunItemId()))
                .toList()
        );
    }
}
