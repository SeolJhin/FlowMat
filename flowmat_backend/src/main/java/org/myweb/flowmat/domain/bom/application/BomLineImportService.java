package org.myweb.flowmat.domain.bom.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.request.BomLineCreateRequest;
import org.myweb.flowmat.domain.bom.api.dto.request.BomLineImportRequest;
import org.myweb.flowmat.domain.bom.api.dto.response.BomLineImportResponse;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.domain.entity.BomLine;
import org.myweb.flowmat.domain.bom.domain.enums.BomStatus;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.myweb.flowmat.domain.bom.repository.BomLineRepository;
import org.myweb.flowmat.domain.catalog.application.ItemStatusRule;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills a draft BOM's materials from a spreadsheet (docs/domain/item-import.md "BOM 자재"). Every row is checked first,
 * with the approval rules that concern a single line (docs/domain/inventory-bom-lot-contract.md §5): the material
 * exists, is not the product, is not listed twice, has no approved BOM of its own, and its unit converts to the
 * material's unit. When any row is wrong, or it is a dry run, nothing is saved; otherwise the lines go through the
 * ordinary add and delete in one transaction.
 */
@Service
@RequiredArgsConstructor
public class BomLineImportService {

    public static final int MAX_ROWS = 500;
    private static final String NOT_DELETED = "N";

    private final BomHeaderRepository bomHeaderRepository;
    private final BomLineRepository bomLineRepository;
    private final ItemRepository itemRepository;
    private final UnitConverter unitConverter;
    private final BomService bomService;
    private final ProjectAccessService projectAccessService;

    @Transactional
    public BomLineImportResponse importLines(String bomId, BomLineImportRequest request) {
        BomHeader header = bomHeaderRepository.findByBomIdAndDeletedYn(bomId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectWriteAccess(header.getProjectId());
        if (BomStatus.fromCode(header.getBomStatus()) != BomStatus.DRAFT) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only a draft BOM can take new materials.");
        }
        List<BomLineImportRequest.Row> rows = request.rows() == null ? List.of() : request.rows();
        if (rows.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The file has no materials.");
        }
        if (rows.size() > MAX_ROWS) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Import at most " + MAX_ROWS + " materials at a time.");
        }

        Map<String, List<Item>> byCode = itemRepository.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(header.getProjectId(), NOT_DELETED)
            .stream()
            .collect(Collectors.groupingBy(Item::getItemCode));
        List<BomLine> current = bomLineRepository.findAllByBomIdOrderBySortOrderAscBomLineIdAsc(header.getBomId());
        Set<String> taken = request.replace()
            ? new HashSet<>()
            : current.stream().map(BomLine::getChildItemId).collect(Collectors.toCollection(HashSet::new));
        Set<String> producedByBom = bomHeaderRepository
            .findAllByProjectIdAndBomStatusAndDeletedYn(header.getProjectId(), BomStatus.APPROVED.code(), NOT_DELETED).stream()
            .map(BomHeader::getTargetItemId)
            .filter(target -> !target.equals(header.getTargetItemId()))
            .collect(Collectors.toSet());

        List<BomLineImportResponse.RowResult> results = new ArrayList<>();
        List<BomLineCreateRequest> additions = new ArrayList<>();
        int errors = 0;
        for (int index = 0; index < rows.size(); index++) {
            BomLineImportRequest.Row row = rows.get(index);
            String code = trimToNull(row.itemCode());
            List<String> problems = new ArrayList<>();
            BomLineCreateRequest line = check(row, code, header, byCode, taken, producedByBom, problems);
            if (problems.isEmpty()) {
                additions.add(line);
                results.add(new BomLineImportResponse.RowResult(index + 1, code, "add", null));
            } else {
                errors++;
                results.add(new BomLineImportResponse.RowResult(index + 1, code, "error", String.join("; ", problems)));
            }
        }

        int removed = request.replace() ? current.size() : 0;
        boolean apply = errors == 0 && !request.dryRun();
        if (apply) {
            if (request.replace()) {
                for (BomLine line : current) {
                    bomService.deleteLine(header.getBomId(), line.getBomLineId());
                }
            }
            for (BomLineCreateRequest line : additions) {
                bomService.addLine(header.getBomId(), line);
            }
        }
        return new BomLineImportResponse(request.dryRun(), apply, additions.size(), removed, errors, results);
    }

    private BomLineCreateRequest check(
        BomLineImportRequest.Row row,
        String code,
        BomHeader header,
        Map<String, List<Item>> byCode,
        Set<String> taken,
        Set<String> producedByBom,
        List<String> problems
    ) {
        if (code == null) {
            problems.add("Item code is missing");
            return null;
        }
        List<Item> matches = byCode.getOrDefault(code, List.of());
        if (matches.isEmpty()) {
            problems.add("No item has code " + code);
        } else if (matches.size() > 1) {
            problems.add(matches.size() + " items have code " + code);
        }
        BigDecimal quantity = null;
        String quantityText = trimToNull(row.quantity());
        if (quantityText == null) {
            problems.add("Quantity is missing");
        } else {
            try {
                quantity = new BigDecimal(quantityText.replace(",", ""));
                if (quantity.signum() <= 0) {
                    problems.add("Quantity must be greater than 0");
                }
            } catch (NumberFormatException e) {
                problems.add("Quantity is not a number: " + quantityText);
            }
        }
        String unit = trimToNull(row.unit());
        if (unit == null) {
            problems.add("Unit is missing");
        }
        if (matches.size() != 1) {
            return null;
        }
        Item material = matches.get(0);
        if (!ItemStatusRule.isActive(material)) {
            problems.add(ItemStatusRule.refusal(material, "use it in a BOM"));
        }
        if (material.getItemId().equals(header.getTargetItemId())) {
            problems.add(code + " is the item this BOM produces");
        }
        if (!taken.add(material.getItemId())) {
            problems.add(code + " is already a material of this BOM; combine the lines");
        }
        if (producedByBom.contains(material.getItemId())) {
            problems.add(code + " has its own approved BOM; multi-level BOMs are not supported yet");
        }
        if (unit != null) {
            try {
                unitConverter.toItemUnit(BigDecimal.ONE, unit, material.getUnitId());
            } catch (BusinessException e) {
                problems.add(e.getMessage());
            }
        }
        return problems.isEmpty()
            ? new BomLineCreateRequest(material.getItemId(), quantity, unit, null, null, null, null, trimToNull(row.note()))
            : null;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
