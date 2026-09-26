package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.api.dto.response.StockMovementSummaryResponse;
import org.myweb.flowmat.domain.inventory.api.dto.response.StockSnapshotResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.myweb.flowmat.domain.inventory.domain.enums.InventoryTransactionType;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A period's stock movement per item (docs/domain/stock-ledger.md "기간 수불"). The opening and closing balances are the
 * stock at the two moments ({@link StockSnapshotService}); in between, the ledger's movements are added up by kind.
 * Status-only movements (reserve, release, quarantine) change no quantity and are left out. Read only.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementSummaryService {

    private static final int SCALE = 4;

    private final StockSnapshotService stockSnapshotService;
    private final InventoryTransactionRepository transactionRepository;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final ProjectAccessService projectAccessService;

    /** Running totals for one item. */
    private static final class Totals {
        BigDecimal opening = BigDecimal.ZERO;
        BigDecimal received = BigDecimal.ZERO;
        BigDecimal produced = BigDecimal.ZERO;
        BigDecimal issued = BigDecimal.ZERO;
        BigDecimal consumed = BigDecimal.ZERO;
        BigDecimal transferred = BigDecimal.ZERO;
        BigDecimal corrected = BigDecimal.ZERO;
        BigDecimal closing = BigDecimal.ZERO;
    }

    public StockMovementSummaryResponse summary(String projectId, OffsetDateTime from, OffsetDateTime to) {
        projectAccessService.requireProjectReadAccess(projectId);
        if (from == null || to == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give the start and the end of the period.");
        }
        if (!from.isBefore(to)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The period must end after it starts.");
        }

        Map<String, Totals> byItem = new HashMap<>();
        for (StockSnapshotResponse.Row row : stockSnapshotService.at(projectId, from).rows()) {
            Totals totals = byItem.computeIfAbsent(row.itemId(), id -> new Totals());
            totals.opening = totals.opening.add(row.quantity());
        }
        for (StockSnapshotResponse.Row row : stockSnapshotService.at(projectId, to).rows()) {
            Totals totals = byItem.computeIfAbsent(row.itemId(), id -> new Totals());
            totals.closing = totals.closing.add(row.quantity());
        }
        for (InventoryTransaction movement
            : transactionRepository.findAllByProjectIdAndCreatedAtGreaterThanAndCreatedAtLessThanEqual(projectId, from, to)) {
            BigDecimal delta = movement.getQuantityDelta();
            if (delta == null || delta.signum() == 0) {
                continue;
            }
            Totals totals = byItem.computeIfAbsent(movement.getItemId(), id -> new Totals());
            InventoryTransactionType type = InventoryTransactionType.fromCode(movement.getTransactionType()).orElse(null);
            if (type == null) {
                totals.corrected = totals.corrected.add(delta);
                continue;
            }
            switch (type) {
                case RECEIPT -> totals.received = totals.received.add(delta);
                case PRODUCTION_OUTPUT -> totals.produced = totals.produced.add(delta);
                case ISSUE -> totals.issued = totals.issued.subtract(delta);
                case PRODUCTION_INPUT -> totals.consumed = totals.consumed.subtract(delta);
                case TRANSFER_IN, TRANSFER_OUT -> totals.transferred = totals.transferred.add(delta);
                default -> totals.corrected = totals.corrected.add(delta);
            }
        }

        Map<String, Item> items = StreamSupport.stream(itemRepository.findAllById(byItem.keySet()).spliterator(), false)
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        Map<String, String> units = StreamSupport.stream(unitMasterRepository.findAllById(
                items.values().stream().map(Item::getUnitId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(UnitMaster::getUnitId, UnitMaster::getUnitCode, (first, second) -> first));

        List<StockMovementSummaryResponse.Line> lines = byItem.entrySet().stream()
            .map(entry -> {
                Item item = items.get(entry.getKey());
                Totals t = entry.getValue();
                BigDecimal explained = t.opening.add(t.received).add(t.produced).subtract(t.issued).subtract(t.consumed)
                    .add(t.transferred).add(t.corrected);
                return new StockMovementSummaryResponse.Line(
                    entry.getKey(),
                    item == null ? null : item.getItemCode(),
                    item == null ? null : item.getItemName(),
                    item == null ? null : units.get(item.getUnitId()),
                    scale(t.opening),
                    scale(t.received),
                    scale(t.produced),
                    scale(t.issued),
                    scale(t.consumed),
                    scale(t.transferred),
                    scale(t.corrected),
                    scale(t.closing),
                    scale(t.closing.subtract(explained))
                );
            })
            .filter(line -> Stream.of(line.opening(), line.received(), line.produced(), line.issued(), line.consumed(),
                line.transferred(), line.corrected(), line.closing()).anyMatch(value -> value.signum() != 0))
            .sorted(Comparator.comparing(StockMovementSummaryResponse.Line::itemCode, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        return new StockMovementSummaryResponse(from, to, lines);
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
