package org.myweb.flowmat.domain.bom.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.domain.entity.BomLine;
import org.myweb.flowmat.domain.bom.domain.enums.BomStatus;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.myweb.flowmat.domain.bom.repository.BomLineRepository;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;

/**
 * The project's approved BOMs as a tree of items (docs/domain/multi-level-bom.md): an item with an approved BOM is made
 * from that BOM's materials, which may have approved BOMs of their own. Approval keeps the tree free of loops and at most
 * {@link #MAX_LEVELS} deep; the walks here still stop at that depth.
 */
public final class BomTree {

    /** The deepest a BOM may go through its materials' BOMs. */
    public static final int MAX_LEVELS = 10;
    /** A line the BOM consumes; the other line types are what a batch gives off (docs/domain/bom-by-products.md). */
    public static final String MATERIAL = "material";
    public static final Set<String> LINE_TYPES = Set.of(MATERIAL, "by_product", "waste");
    private static final String NOT_DELETED = "N";

    private BomTree() {
    }

    /** Item → its approved BOM; the highest revision if an item somehow has two. */
    public static Map<String, BomHeader> approvedByItem(BomHeaderRepository headers, String projectId) {
        return headers.findAllByProjectIdAndBomStatusAndDeletedYn(projectId, BomStatus.APPROVED.code(), NOT_DELETED).stream()
            .collect(Collectors.toMap(BomHeader::getTargetItemId, Function.identity(),
                (one, other) -> Comparator.comparing(BomHeader::getBomVersion).compare(one, other) >= 0 ? one : other));
    }

    /**
     * Item → the materials of its approved BOM. {@code replacedItemId}'s approved BOM is left out: a revision of that item
     * is being checked and would replace it.
     */
    public static Map<String, List<String>> approvedChildren(
        BomHeaderRepository headers,
        BomLineRepository lines,
        String projectId,
        String replacedItemId
    ) {
        Map<String, BomHeader> approved = new HashMap<>(approvedByItem(headers, projectId));
        if (replacedItemId != null) {
            approved.remove(replacedItemId);
        }
        Map<String, String> itemByBom = approved.values().stream()
            .collect(Collectors.toMap(BomHeader::getBomId, BomHeader::getTargetItemId));
        Map<String, List<String>> tree = new HashMap<>();
        if (itemByBom.isEmpty()) {
            return tree;
        }
        for (BomLine line : lines.findAllByBomIdIn(List.copyOf(itemByBom.keySet()))) {
            if (!isMaterial(line.getLineType())) {
                continue;
            }
            tree.computeIfAbsent(itemByBom.get(line.getBomId()), item -> new ArrayList<>()).add(line.getChildItemId());
        }
        return tree;
    }

    /**
     * How much of a line's material one unit of the BOM's product takes: the line quantity in the material's unit ÷ the
     * batch size in the product's unit, 12 decimals. The unit ids are the material's and the product's (null when unknown).
     * Throws a 400 when a quantity cannot be converted or the batch is not above zero.
     */
    public static BigDecimal perProductUnit(
        UnitConverter converter,
        BomHeader header,
        BomLine line,
        String materialUnitId,
        String productUnitId
    ) {
        BigDecimal quantity = converter.toItemUnit(line.getQuantity(), line.getUnit(), materialUnitId).quantity();
        BigDecimal batch = converter.toItemUnit(header.getBaseQuantity(), header.getBaseUnit(), productUnitId).quantity();
        if (quantity == null || batch == null || batch.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base quantity must be greater than 0.");
        }
        return quantity.divide(batch, 12, RoundingMode.HALF_UP);
    }

    /** Lines written before line types were used have none; they are materials. */
    public static boolean isMaterial(String lineType) {
        return lineType == null || MATERIAL.equals(lineType);
    }

    /** A way from {@code from} down to {@code to} through approved BOMs, both ends included; null when there is none. */
    public static List<String> pathTo(String from, String to, Map<String, List<String>> tree) {
        List<String> path = new ArrayList<>();
        path.add(from);
        return walk(from, to, tree, path, new HashSet<>()) ? path : null;
    }

    private static boolean walk(String at, String to, Map<String, List<String>> tree, List<String> path, Set<String> seen) {
        if (at.equals(to)) {
            return true;
        }
        if (!seen.add(at) || path.size() > MAX_LEVELS + 1) {
            return false;
        }
        for (String child : tree.getOrDefault(at, List.of())) {
            path.add(child);
            if (walk(child, to, tree, path, seen)) {
                return true;
            }
            path.remove(path.size() - 1);
        }
        return false;
    }

    /** Levels of approved BOMs below an item: 0 for a bought item, 1 for an item made only from bought ones. */
    public static int depth(String itemId, Map<String, List<String>> tree) {
        return depth(itemId, tree, new HashMap<>(), 0);
    }

    private static int depth(String itemId, Map<String, List<String>> tree, Map<String, Integer> known, int reached) {
        Integer cached = known.get(itemId);
        if (cached != null) {
            return cached;
        }
        List<String> children = tree.get(itemId);
        if (children == null || children.isEmpty() || reached > MAX_LEVELS) {
            return 0;
        }
        int deepest = 0;
        for (String child : children) {
            deepest = Math.max(deepest, depth(child, tree, known, reached + 1));
        }
        known.put(itemId, deepest + 1);
        return deepest + 1;
    }

    /**
     * Low-level code of every item in the tree: the lowest level it appears on under any item (0 at the top). Planning
     * works through items in this order, so an item's demand is complete before its own BOM is exploded.
     */
    public static Map<String, Integer> lowLevelCodes(Map<String, List<String>> tree) {
        Map<String, Integer> codes = new HashMap<>();
        tree.forEach((parent, children) -> {
            codes.putIfAbsent(parent, 0);
            children.forEach(child -> codes.putIfAbsent(child, 0));
        });
        for (int round = 0; round <= MAX_LEVELS; round++) {
            boolean changed = false;
            for (Map.Entry<String, List<String>> entry : tree.entrySet()) {
                int below = codes.get(entry.getKey()) + 1;
                for (String child : entry.getValue()) {
                    if (codes.get(child) < below && below <= MAX_LEVELS + 1) {
                        codes.put(child, below);
                        changed = true;
                    }
                }
            }
            if (!changed) {
                break;
            }
        }
        return codes;
    }
}
