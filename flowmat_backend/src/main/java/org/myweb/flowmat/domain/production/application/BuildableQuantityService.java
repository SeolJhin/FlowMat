package org.myweb.flowmat.domain.production.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomLineResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomResponse;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.myweb.flowmat.domain.bom.domain.enums.BomStatus;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.domain.entity.UnitMaster;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.catalog.repository.UnitMasterRepository;
import org.myweb.flowmat.domain.production.api.dto.response.BuildableQuantityResponse;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;

/**
 * How much of a BOM's product the usable stock could make right now (docs/domain/material-requirements.md "지금 만들 수
 * 있는 양"): each material allows usable ÷ what one batch needs × the batch size, and the product is limited by the
 * material that allows least. What a batch needs is the line quantity in the material's unit, 4 decimals, as the BOM
 * requirement calculation gives it for a whole batch (worked out per batch rather than per unit, so a small per-unit need
 * is not lost to rounding). Rounded down, to whole units when the product is counted, since a part of the last unit cannot
 * be made.
 */
@Service
@RequiredArgsConstructor
public class BuildableQuantityService {

    private static final String NOT_DELETED = "N";
    private static final int SCALE = 4;

    private final BomService bomService;
    private final ItemRepository itemRepository;
    private final UnitMasterRepository unitMasterRepository;
    private final UnitConverter unitConverter;
    private final UsableStock usableStock;

    public BuildableQuantityResponse buildable(String bomId) {
        BomResponse bom = bomService.getBom(bomId);
        Stock stock = stock(bom.projectId(), List.of(bom));
        return compute(bom, stock);
    }

    /**
     * Every approved BOM of the project against one read of the stock. A BOM that cannot be worked out (a material or
     * unit that has since gone) comes back with the reason instead of failing the rest.
     */
    public List<BuildableQuantityResponse> approved(String projectId) {
        List<BomResponse> boms = bomService.listBoms(projectId, null).stream()
            .filter(bom -> BomStatus.APPROVED.code().equals(bom.bomStatus()))
            .toList();
        Stock stock = stock(projectId.trim(), boms);
        List<BuildableQuantityResponse> result = new ArrayList<>();
        for (BomResponse bom : boms) {
            try {
                result.add(compute(bom, stock));
            } catch (BusinessException e) {
                result.add(new BuildableQuantityResponse(bom.bomId(), bom.targetItemId(), bom.baseUnit(), bom.baseQuantity(),
                    null, null, List.of(), e.getMessage()));
            }
        }
        return result;
    }

    /** The items, units and usable stock the BOMs need, each read once. */
    private record Stock(Map<String, Item> items, Map<String, UnitMaster> units, Map<String, BigDecimal> usable) {
    }

    private Stock stock(String projectId, List<BomResponse> boms) {
        Set<String> materials = boms.stream()
            .flatMap(bom -> bom.lines().stream().map(BomLineResponse::childItemId))
            .collect(Collectors.toSet());
        Set<String> itemIds = new HashSet<>(materials);
        boms.forEach(bom -> itemIds.add(bom.targetItemId()));
        Map<String, Item> items = itemRepository.findAllById(itemIds).stream()
            .filter(item -> NOT_DELETED.equals(item.getDeletedYn()))
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        Map<String, UnitMaster> units = unitMasterRepository.findAllByOrderByUnitTypeAscUnitCodeAsc().stream()
            .collect(Collectors.toMap(UnitMaster::getUnitId, Function.identity()));
        return new Stock(items, units, materials.isEmpty() ? Map.of() : usableStock.byItem(projectId, materials));
    }

    private BuildableQuantityResponse compute(BomResponse bom, Stock stock) {
        Item target = stock.items().get(bom.targetItemId());
        if (target == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The BOM's product no longer exists.");
        }
        UnitMaster unit = target.getUnitId() == null ? null : stock.units().get(target.getUnitId());
        BigDecimal batch = unitConverter.toItemUnit(bom.baseQuantity(), bom.baseUnit(), target.getUnitId()).quantity();
        if (batch == null || batch.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Base quantity must be greater than 0.");
        }
        int buildableScale = unit != null && "count".equals(unit.getUnitType()) ? 0 : SCALE;

        List<BuildableQuantityResponse.Line> lines = new ArrayList<>();
        BigDecimal least = null;
        String limiting = null;
        for (BomLineResponse line : bom.lines()) {
            Item child = stock.items().get(line.childItemId());
            if (child == null) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "Material " + line.childItemId() + " no longer exists.");
            }
            UnitConverter.Conversion need = unitConverter.toItemUnit(line.quantity(), line.unit(), child.getUnitId());
            BigDecimal perBatch = need.quantity().setScale(SCALE, RoundingMode.HALF_UP);
            BigDecimal have = stock.usable().getOrDefault(child.getItemId(), BigDecimal.ZERO).max(BigDecimal.ZERO);
            // A need that rounds to nothing does not limit the product.
            BigDecimal allows = perBatch.signum() <= 0 ? null
                : have.multiply(batch).divide(perBatch, buildableScale, RoundingMode.DOWN);
            if (allows != null && (least == null || allows.compareTo(least) < 0)) {
                least = allows;
                limiting = child.getItemId();
            }
            lines.add(new BuildableQuantityResponse.Line(child.getItemId(), need.toUnitCode(), perBatch,
                have.setScale(SCALE, RoundingMode.HALF_UP), allows));
        }
        return new BuildableQuantityResponse(bom.bomId(), bom.targetItemId(), unit == null ? bom.baseUnit() : unit.getUnitCode(),
            batch, least, limiting, lines, null);
    }
}
