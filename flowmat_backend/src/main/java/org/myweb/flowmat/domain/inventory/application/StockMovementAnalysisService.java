package org.myweb.flowmat.domain.inventory.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.inventory.api.dto.response.StockMovementAnalysisResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository;
import org.myweb.flowmat.domain.inventory.repository.InventoryTransactionRepository.ItemMovementTotals;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumption, days of cover and idle time per item (docs/domain/stock-analysis.md). Consumption is what left stock to
 * be used: issues and production inputs. Transfers and adjustments are not consumption, and a reversed issue does not
 * count. Read only; the project's movements are loaded and added up here.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementAnalysisService {

    public static final int DEFAULT_DAYS = 30;
    public static final int MAX_DAYS = 365;
    private static final String NOT_DELETED = "N";
    private static final int SCALE = 4;
    private static final BigDecimal A_SHARE = new BigDecimal("0.80");
    private static final BigDecimal B_SHARE = new BigDecimal("0.95");

    private final InventoryTransactionRepository transactionRepository;
    private final InventoryRepository inventoryRepository;
    private final LotMasterRepository lotMasterRepository;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final ProjectAccessService projectAccessService;

    public StockMovementAnalysisResponse analyse(String projectId, Integer days) {
        projectAccessService.requireProjectReadAccess(projectId);
        int window = days == null ? DEFAULT_DAYS : days;
        if (window < 1 || window > MAX_DAYS) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Pick a window of 1 to " + MAX_DAYS + " days.");
        }
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime from = now.minusDays(window);

        // One row per item from the database; reversed movements are already left out there.
        Map<String, BigDecimal> consumed = new HashMap<>();
        Map<String, OffsetDateTime> lastConsumed = new HashMap<>();
        Map<String, OffsetDateTime> lastReceived = new HashMap<>();
        Map<String, OffsetDateTime> firstReceived = new HashMap<>();
        for (ItemMovementTotals totals : transactionRepository.findItemMovementTotals(projectId, from)) {
            String itemId = totals.getItemId();
            if (totals.getConsumed() != null && totals.getConsumed().signum() != 0) {
                consumed.put(itemId, totals.getConsumed());
            }
            putIfPresent(lastConsumed, itemId, totals.getLastConsumedAt());
            putIfPresent(firstReceived, itemId, totals.getFirstReceivedAt());
            putIfPresent(lastReceived, itemId, totals.getLastReceivedAt());
        }

        // On hand counts every record; usable leaves out what cannot be used, as the reorder list does.
        List<Inventory> rows = inventoryRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED);
        Map<String, LotMaster> lots = StreamSupport.stream(lotMasterRepository.findAllById(
                rows.stream().map(Inventory::getLotId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
        LocalDate today = LocalDate.now();
        Map<String, BigDecimal> onHand = new HashMap<>();
        Map<String, BigDecimal> usable = new HashMap<>();
        for (Inventory row : rows) {
            onHand.merge(row.getItemId(), zeroIfNull(row.getQuantity()), BigDecimal::add);
            LotMaster lot = row.getLotId() == null ? null : lots.get(row.getLotId());
            boolean unusable = "quarantined".equals(row.getInventoryStatus())
                || lot != null && ("closed".equals(lot.getLotStatus()) || lot.isExpiredOn(today));
            if (!unusable) {
                usable.merge(row.getItemId(), zeroIfNull(row.getAvailableQuantity()), BigDecimal::add);
            }
        }

        List<Item> items = itemRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(projectId, NOT_DELETED).stream()
            .filter(item -> positive(onHand.get(item.getItemId())) || positive(consumed.get(item.getItemId())))
            .sorted(Comparator.comparing(Item::getItemCode, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        Map<String, String> units = StreamSupport.stream(unitMasterRepository.findAllById(
                items.stream().map(Item::getUnitId).filter(Objects::nonNull).collect(Collectors.toSet())).spliterator(), false)
            .collect(Collectors.toMap(UnitMaster::getUnitId, UnitMaster::getUnitCode, (first, second) -> first));
        BigDecimal windowDays = BigDecimal.valueOf(window);
        Map<String, BigDecimal> usedValue = new HashMap<>();
        for (Item item : items) {
            BigDecimal unitCost = unitCostOf(item);
            if (unitCost != null) {
                usedValue.put(item.getItemId(), scale(consumed.getOrDefault(item.getItemId(), BigDecimal.ZERO).multiply(unitCost)));
            }
        }
        Map<String, String> classes = abcClasses(usedValue);

        List<StockMovementAnalysisResponse.Line> lines = items.stream().map(item -> {
            String itemId = item.getItemId();
            BigDecimal held = scale(onHand.getOrDefault(itemId, BigDecimal.ZERO));
            BigDecimal free = scale(usable.getOrDefault(itemId, BigDecimal.ZERO));
            BigDecimal used = scale(consumed.getOrDefault(itemId, BigDecimal.ZERO));
            BigDecimal daily = used.divide(windowDays, SCALE, RoundingMode.HALF_UP);
            // usable × days / consumed rather than usable / daily, so the rounded daily rate does not skew it.
            BigDecimal cover = used.signum() > 0
                ? free.max(BigDecimal.ZERO).multiply(windowDays).divide(used, 1, RoundingMode.HALF_UP)
                : null;
            Integer leadTime = item.getLeadTimeDays();
            boolean belowLeadTime = cover != null && leadTime != null && leadTime > 0
                && cover.compareTo(BigDecimal.valueOf(leadTime)) < 0;
            OffsetDateTime idleSince = lastConsumed.getOrDefault(itemId, firstReceived.get(itemId));
            BigDecimal unitCost = unitCostOf(item);
            return new StockMovementAnalysisResponse.Line(
                itemId,
                item.getItemCode(),
                item.getItemName(),
                units.get(item.getUnitId()),
                held,
                free,
                unitCost == null ? null : scale(held.multiply(unitCost)),
                used,
                daily,
                cover,
                leadTime,
                belowLeadTime,
                lastConsumed.get(itemId),
                lastReceived.get(itemId),
                idleSince == null ? null : ChronoUnit.DAYS.between(idleSince, now),
                usedValue.get(itemId),
                classes.get(itemId)
            );
        }).toList();
        return new StockMovementAnalysisResponse(window, from, lines);
    }

    /**
     * Ranks by value used, highest first. An item is A while the value ranked above it is under 80% of the total, B
     * under 95%, otherwise C; so the top item is always A. Anything not used is C, and with nothing used at all every
     * item is C.
     */
    static Map<String, String> abcClasses(Map<String, BigDecimal> usedValue) {
        BigDecimal total = usedValue.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, String> classes = new HashMap<>();
        BigDecimal before = BigDecimal.ZERO;
        List<Map.Entry<String, BigDecimal>> ranked = usedValue.entrySet().stream()
            .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
            .toList();
        for (Map.Entry<String, BigDecimal> entry : ranked) {
            if (total.signum() == 0 || entry.getValue().signum() == 0) {
                classes.put(entry.getKey(), "C");
                continue;
            }
            BigDecimal share = before.divide(total, 6, RoundingMode.HALF_UP);
            classes.put(entry.getKey(), share.compareTo(A_SHARE) < 0 ? "A" : share.compareTo(B_SHARE) < 0 ? "B" : "C");
            before = before.add(entry.getValue());
        }
        return classes;
    }

    private static BigDecimal unitCostOf(Item item) {
        return item.getUnitCost() != null && item.getUnitCost().signum() > 0 ? item.getUnitCost() : null;
    }

    /** Reads a timestamptz as the driver returned it. */
    private static void putIfPresent(Map<String, OffsetDateTime> into, String itemId, Object value) {
        OffsetDateTime at = switch (value) {
            case null -> null;
            case OffsetDateTime time -> time;
            case Instant instant -> instant.atOffset(ZoneOffset.UTC);
            case Timestamp timestamp -> timestamp.toInstant().atOffset(ZoneOffset.UTC);
            case LocalDateTime local -> local.atZone(ZoneId.systemDefault()).toOffsetDateTime();
            default -> throw new IllegalStateException("Unexpected time type " + value.getClass().getName());
        };
        if (at != null) {
            into.put(itemId, at);
        }
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }
}
