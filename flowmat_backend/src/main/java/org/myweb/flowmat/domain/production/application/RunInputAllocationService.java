package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.enums.LotStatus;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunItemRecordRequest;
import org.myweb.flowmat.domain.production.api.dto.request.RunInputAllocationRequest;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunItemResponse;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunResponse;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Takes one input from a LOT-tracked item's stock, first-expiring LOT first (docs/domain/lot-expiry.md "여러 LOT에 나눠
 * 투입"): one ordinary recording per LOT, all in one transaction, so either the whole quantity is recorded or nothing is.
 * Each recording goes through {@link ProductionRunService#recordRunItem}, so its checks, stock movement and LOT genealogy
 * are the usual ones.
 */
@Service
@RequiredArgsConstructor
public class RunInputAllocationService {

    private static final String NOT_DELETED = "N";

    private final ProductionRunService productionRunService;
    private final ProjectAccessService projectAccessService;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final UnitConverter unitConverter;
    private final InventoryRepository inventoryRepository;
    private final LotMasterRepository lotMasterRepository;

    @Transactional
    public List<ProductionRunItemResponse> allocate(String productionRunId, RunInputAllocationRequest request) {
        ProductionRunResponse run = productionRunService.getRun(productionRunId);
        projectAccessService.requireProjectWriteAccess(run.projectId());
        Item item = itemRepository.findByItemIdAndDeletedYn(request.itemId(), NOT_DELETED)
            .filter(found -> run.projectId().equals(found.getProjectId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!"Y".equals(item.getLotManageYn())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, item.getItemCode() + " is not LOT-tracked; record it directly.");
        }
        // Allocate in the item's own unit; each piece is then recorded in that unit.
        UnitConverter.Conversion conversion = unitConverter.toItemUnit(request.quantity(), request.unit(), item.getUnitId());
        BigDecimal needed = conversion.quantity();
        String recordUnit = item.getUnitId() == null
            ? request.unit().trim()
            : unitMasterRepository.findById(item.getUnitId()).map(unit -> unit.getUnitCode()).orElse(request.unit().trim());

        // Locked before they are read, so a concurrent movement waits instead of draining a record this split counts on.
        List<Inventory> stock = inventoryRepository.findAllById(inventoryRepository.lockItemStock(run.projectId(), item.getItemId()))
            .stream()
            .sorted(Comparator.comparing(Inventory::getCreatedAt, Comparator.nullsLast(Comparator.<OffsetDateTime>naturalOrder()))
                .thenComparing(Inventory::getInventoryId))
            .filter(row -> row.getLotId() != null)
            .filter(row -> !"quarantined".equalsIgnoreCase(row.getInventoryStatus()))
            .filter(row -> row.getAvailableQuantity() != null && row.getAvailableQuantity().signum() > 0)
            .toList();
        Map<String, LotMaster> lots = lotMasterRepository.findAllById(stock.stream().map(Inventory::getLotId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
        LocalDate today = LocalDate.now();
        List<Inventory> usable = stock.stream()
            .filter(row -> {
                LotMaster lot = lots.get(row.getLotId());
                return lot != null && LotStatus.fromCode(lot.getLotStatus()).usable() && !lot.isExpiredOn(today);
            })
            .sorted(Comparator
                .comparing((Inventory row) -> lots.get(row.getLotId()).getExpiryDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(row -> lots.get(row.getLotId()).getReceivedAt(), Comparator.nullsLast(Comparator.<OffsetDateTime>naturalOrder()))
                .thenComparing(row -> lots.get(row.getLotId()).getLotNo(), Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        BigDecimal available = usable.stream().map(Inventory::getAvailableQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (available.compareTo(needed) < 0) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only " + available.stripTrailingZeros().toPlainString() + " " + recordUnit
                + " of " + item.getItemCode() + " is in usable LOTs; " + needed.stripTrailingZeros().toPlainString()
                + " needed. Nothing was recorded.");
        }

        List<ProductionRunItemResponse> recorded = new ArrayList<>();
        BigDecimal remaining = needed;
        for (Inventory row : usable) {
            if (remaining.signum() <= 0) {
                break;
            }
            BigDecimal piece = row.getAvailableQuantity().min(remaining);
            recorded.add(productionRunService.recordRunItem(productionRunId, new ProductionRunItemRecordRequest(
                request.processId(), null, row.getInventoryId(), item.getItemId(), "input", piece, piece, recordUnit)));
            remaining = remaining.subtract(piece);
        }
        return recorded;
    }
}
