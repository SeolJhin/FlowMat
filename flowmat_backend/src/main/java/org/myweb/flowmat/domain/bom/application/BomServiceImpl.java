package org.myweb.flowmat.domain.bom.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.request.BomCreateRequest;
import org.myweb.flowmat.domain.bom.api.dto.request.BomLineCreateRequest;
import org.myweb.flowmat.domain.bom.api.dto.request.BomUpdateRequest;
import org.myweb.flowmat.domain.bom.api.dto.response.BomLineResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomRequirementResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomResponse;
import org.myweb.flowmat.domain.bom.api.dto.response.BomWhereUsedResponse;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.domain.entity.BomLine;
import org.myweb.flowmat.domain.bom.domain.enums.BomStatus;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.myweb.flowmat.domain.bom.repository.BomLineRepository;
import org.myweb.flowmat.domain.catalog.application.UnitConverter;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BomServiceImpl implements BomService {

    static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";
    /** Requirement factors keep this many decimals before the final 4-decimal stock quantity. */
    private static final int FACTOR_SCALE = 12;
    private static final int STOCK_SCALE = 4;

    private final BomHeaderRepository bomHeaderRepository;
    private final BomLineRepository bomLineRepository;
    private final ItemRepository itemRepository;
    private final UnitConverter unitConverter;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    @Override
    public List<BomResponse> listBoms(String projectId, String targetItemId) {
        if (projectId == null || projectId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        projectAccessService.requireProjectReadAccess(projectId.trim());
        List<BomHeader> headers = targetItemId == null || targetItemId.isBlank()
            ? bomHeaderRepository.findAllByProjectIdAndDeletedYnOrderByTargetItemIdAscBomVersionDesc(projectId.trim(), NOT_DELETED)
            : bomHeaderRepository.findAllByProjectIdAndTargetItemIdAndDeletedYnOrderByBomVersionDesc(
                projectId.trim(), targetItemId.trim(), NOT_DELETED);
        return headers.stream().map(this::toResponse).toList();
    }

    @Override
    public List<BomWhereUsedResponse> whereUsed(String projectId, String itemId) {
        if (projectId == null || projectId.isBlank() || itemId == null || itemId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId and itemId are required.");
        }
        String project = projectId.trim();
        projectAccessService.requireProjectReadAccess(project);
        List<BomLine> lines = bomLineRepository.findAllByChildItemId(itemId.trim());
        Map<String, BomHeader> headers = bomHeaderRepository.findAllById(lines.stream().map(BomLine::getBomId).distinct().toList())
            .stream()
            .filter(header -> project.equals(header.getProjectId()) && NOT_DELETED.equals(header.getDeletedYn()))
            .collect(Collectors.toMap(BomHeader::getBomId, Function.identity()));
        Map<String, Item> targets = itemRepository.findAllById(headers.values().stream().map(BomHeader::getTargetItemId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        return lines.stream()
            .filter(line -> headers.containsKey(line.getBomId()))
            .map(line -> {
                BomHeader header = headers.get(line.getBomId());
                Item target = targets.get(header.getTargetItemId());
                return new BomWhereUsedResponse(
                    header.getBomId(),
                    header.getBomName(),
                    header.getBomVersion(),
                    header.getBomStatus(),
                    header.getTargetItemId(),
                    target == null ? null : target.getItemCode(),
                    target == null ? null : target.getItemName(),
                    header.getBaseQuantity(),
                    header.getBaseUnit(),
                    line.getBomLineId(),
                    line.getQuantity(),
                    line.getUnit(),
                    line.getScrapRate()
                );
            })
            .sorted(Comparator.comparingInt((BomWhereUsedResponse used) -> statusRank(used.bomStatus()))
                .thenComparing(used -> used.targetItemCode() == null ? "" : used.targetItemCode())
                .thenComparing(BomWhereUsedResponse::bomVersion, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    /** Approved revisions matter most for impact; retired ones are history. */
    private static int statusRank(String status) {
        return switch (BomStatus.fromCode(status)) {
            case APPROVED -> 0;
            case PENDING_APPROVAL -> 1;
            case DRAFT -> 2;
            case RETIRED -> 3;
        };
    }

    @Override
    public BomResponse getBom(String bomId) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectReadAccess(header.getProjectId());
        return toResponse(header);
    }

    @Override
    @Transactional
    public BomResponse createBom(BomCreateRequest request) {
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);
        Item target = findProjectItem(request.targetItemId(), projectId);
        if (bomHeaderRepository.findTopByProjectIdAndTargetItemIdAndDeletedYnOrderByBomVersionDesc(
            projectId, target.getItemId(), NOT_DELETED).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT,
                target.getItemCode() + " already has a BOM. Create a new revision of it instead.");
        }
        requirePositive(request.baseQuantity(), "Base quantity");

        BomHeader header = new BomHeader();
        header.setBomId(idGenerator.generate());
        header.setProjectId(projectId);
        header.setTargetItemId(target.getItemId());
        header.setBomName(request.bomName().trim());
        header.setBomVersion(1);
        header.setBaseQuantity(request.baseQuantity());
        header.setBaseUnit(request.baseUnit().trim());
        header.setBomStatus(BomStatus.DRAFT.code());
        header.setApprovalStatus("draft");
        header.setNote(trimToNull(request.note()));
        header.setCreatedBy(projectAccessService.requireCurrentUserId());
        header.setDeletedYn(NOT_DELETED);
        return toResponse(bomHeaderRepository.save(header));
    }

    @Override
    @Transactional
    public BomResponse updateBom(String bomId, BomUpdateRequest request) {
        BomHeader header = findEditableBom(bomId);
        if (request.bomName() != null && !request.bomName().isBlank()) {
            header.setBomName(request.bomName().trim());
        }
        if (request.baseQuantity() != null) {
            requirePositive(request.baseQuantity(), "Base quantity");
            header.setBaseQuantity(request.baseQuantity());
        }
        if (request.baseUnit() != null && !request.baseUnit().isBlank()) {
            header.setBaseUnit(request.baseUnit().trim());
        }
        if (request.note() != null) {
            header.setNote(trimToNull(request.note()));
        }
        header.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return toResponse(bomHeaderRepository.save(header));
    }

    @Override
    @Transactional
    public void deleteBom(String bomId) {
        BomHeader header = findEditableBom(bomId);
        header.setDeletedYn(DELETED);
        bomHeaderRepository.save(header);
    }

    @Override
    @Transactional
    public BomResponse addLine(String bomId, BomLineCreateRequest request) {
        BomHeader header = findEditableBom(bomId);
        Item child = findProjectItem(request.childItemId(), header.getProjectId());
        requirePositive(request.quantity(), "Material quantity");

        BomLine line = new BomLine();
        line.setBomLineId(idGenerator.generate());
        line.setBomId(header.getBomId());
        line.setChildItemId(child.getItemId());
        line.setLineType("material");
        line.setQuantity(request.quantity());
        line.setUnit(request.unit().trim());
        line.setScrapRate(request.scrapRate() != null ? request.scrapRate() : BigDecimal.ZERO);
        line.setOptionalYn("Y".equalsIgnoreCase(request.optionalYn()) ? "Y" : "N");
        line.setSubstituteGroup(trimToNull(request.substituteGroup()));
        line.setSortOrder(request.sortOrder() != null
            ? request.sortOrder()
            : bomLineRepository.findAllByBomIdOrderBySortOrderAscBomLineIdAsc(header.getBomId()).size() + 1);
        line.setNote(trimToNull(request.note()));
        line.setCreatedBy(projectAccessService.requireCurrentUserId());
        bomLineRepository.save(line);
        return toResponse(header);
    }

    @Override
    @Transactional
    public BomResponse deleteLine(String bomId, String bomLineId) {
        BomHeader header = findEditableBom(bomId);
        BomLine line = bomLineRepository.findById(bomLineId)
            .filter(found -> found.getBomId().equals(header.getBomId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        bomLineRepository.delete(line);
        return toResponse(header);
    }

    @Override
    @Transactional
    public BomResponse createRevision(String bomId) {
        BomHeader source = findBom(bomId);
        projectAccessService.requireProjectWriteAccess(source.getProjectId());
        BomStatus status = BomStatus.fromCode(source.getBomStatus());
        if (status != BomStatus.APPROVED && status != BomStatus.RETIRED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "Only approved or retired revisions can be copied; edit this " + status.code() + " revision instead.");
        }
        List<BomHeader> revisions = bomHeaderRepository.findAllByProjectIdAndTargetItemIdAndDeletedYnOrderByBomVersionDesc(
            source.getProjectId(), source.getTargetItemId(), NOT_DELETED);
        revisions.stream()
            .filter(revision -> BomStatus.fromCode(revision.getBomStatus()) == BomStatus.DRAFT
                || BomStatus.fromCode(revision.getBomStatus()) == BomStatus.PENDING_APPROVAL)
            .findFirst()
            .ifPresent(open -> {
                throw new BusinessException(ErrorCode.CONFLICT,
                    "Revision " + open.getBomVersion() + " is still " + open.getBomStatus() + "; finish or delete it first.");
            });
        int nextVersion = revisions.isEmpty() ? 1 : revisions.get(0).getBomVersion() + 1;
        String actor = projectAccessService.requireCurrentUserId();

        BomHeader copy = new BomHeader();
        copy.setBomId(idGenerator.generate());
        copy.setProjectId(source.getProjectId());
        copy.setTargetItemId(source.getTargetItemId());
        copy.setBomName(source.getBomName());
        copy.setBomVersion(nextVersion);
        copy.setBaseQuantity(source.getBaseQuantity());
        copy.setBaseUnit(source.getBaseUnit());
        copy.setBomStatus(BomStatus.DRAFT.code());
        copy.setApprovalStatus("draft");
        copy.setNote(source.getNote());
        copy.setCreatedBy(actor);
        copy.setDeletedYn(NOT_DELETED);
        bomHeaderRepository.save(copy);

        for (BomLine sourceLine : lines(source.getBomId())) {
            BomLine line = new BomLine();
            line.setBomLineId(idGenerator.generate());
            line.setBomId(copy.getBomId());
            line.setChildItemId(sourceLine.getChildItemId());
            line.setLineType(sourceLine.getLineType());
            line.setQuantity(sourceLine.getQuantity());
            line.setUnit(sourceLine.getUnit());
            line.setScrapRate(sourceLine.getScrapRate());
            line.setOptionalYn(sourceLine.getOptionalYn());
            line.setSubstituteGroup(sourceLine.getSubstituteGroup());
            line.setSortOrder(sourceLine.getSortOrder());
            line.setNote(sourceLine.getNote());
            line.setCreatedBy(actor);
            bomLineRepository.save(line);
        }
        return toResponse(copy);
    }

    @Override
    public BomRequirementResponse calculateRequirements(String bomId, BigDecimal productionQuantity) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectReadAccess(header.getProjectId());
        return requirements(header, productionQuantity);
    }

    @Override
    public BomRequirementResponse requirementsForRun(
        String bomId,
        String projectId,
        String targetItemId,
        BigDecimal productionQuantity
    ) {
        BomHeader header = bomHeaderRepository.findByBomIdAndDeletedYn(bomId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "BOM does not exist."));
        if (!header.getProjectId().equals(projectId)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The BOM belongs to another project.");
        }
        if (BomStatus.fromCode(header.getBomStatus()) != BomStatus.APPROVED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                "BOM " + header.getBomName() + " v" + header.getBomVersion() + " is " + header.getBomStatus()
                    + "; production can only use an approved revision.");
        }
        if (targetItemId != null && !targetItemId.equals(header.getTargetItemId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The BOM produces a different item than this run.");
        }
        return requirements(header, productionQuantity);
    }

    /** productionQuantity / base × line quantity, converted to each material's unit. */
    private BomRequirementResponse requirements(BomHeader header, BigDecimal productionQuantity) {
        requirePositive(productionQuantity, "Production quantity");
        Item target = findProjectItem(header.getTargetItemId(), header.getProjectId());
        BigDecimal base = unitConverter.toItemUnit(header.getBaseQuantity(), header.getBaseUnit(), target.getUnitId()).quantity();
        requirePositive(base, "Base quantity");
        BigDecimal factor = productionQuantity.divide(base, FACTOR_SCALE, RoundingMode.HALF_UP);

        List<BomRequirementResponse.Line> result = new ArrayList<>();
        BigDecimal materialCost = BigDecimal.ZERO;
        boolean costComplete = true;
        for (BomLine line : lines(header.getBomId())) {
            Item child = findProjectItem(line.getChildItemId(), header.getProjectId());
            BigDecimal required = factor.multiply(line.getQuantity()).setScale(8, RoundingMode.HALF_UP).stripTrailingZeros();
            UnitConverter.Conversion conversion = unitConverter.toItemUnit(required, line.getUnit(), child.getUnitId());
            BigDecimal rate = unitConverter.toItemUnit(BigDecimal.ONE, line.getUnit(), child.getUnitId()).quantity();
            BigDecimal itemQuantity = conversion.quantity().setScale(STOCK_SCALE, RoundingMode.HALF_UP);
            // Unit cost is per the item's own unit, so it multiplies the quantity already converted to that unit.
            BigDecimal unitCost = child.getUnitCost() != null && child.getUnitCost().signum() > 0 ? child.getUnitCost() : null;
            BigDecimal lineCost = unitCost == null ? null : itemQuantity.multiply(unitCost).setScale(STOCK_SCALE, RoundingMode.HALF_UP);
            if (lineCost == null) {
                costComplete = false;
            } else {
                materialCost = materialCost.add(lineCost);
            }
            result.add(new BomRequirementResponse.Line(
                line.getBomLineId(),
                child.getItemId(),
                line.getQuantity(),
                line.getUnit(),
                required,
                conversion.toUnitCode(),
                itemQuantity,
                rate,
                unitCost,
                lineCost
            ));
        }
        return new BomRequirementResponse(
            header.getBomId(), header.getBomVersion(), header.getTargetItemId(), productionQuantity, base, result,
            materialCost.setScale(STOCK_SCALE, RoundingMode.HALF_UP), costComplete);
    }

    private BomHeader findEditableBom(String bomId) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectWriteAccess(header.getProjectId());
        BomStatus status = BomStatus.fromCode(header.getBomStatus());
        if (!status.editable()) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Revision " + header.getBomVersion() + " is " + status.code()
                    + " and can no longer change. Create a new revision instead.");
        }
        return header;
    }

    private BomHeader findBom(String bomId) {
        return bomHeaderRepository.findByBomIdAndDeletedYn(bomId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private Item findProjectItem(String itemId, String projectId) {
        Item item = itemRepository.findByItemIdAndDeletedYn(itemId == null ? "" : itemId.trim(), NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Item " + itemId + " does not exist."));
        if (!projectId.equals(item.getProjectId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Item " + item.getItemCode() + " belongs to another project.");
        }
        return item;
    }

    private List<BomLine> lines(String bomId) {
        return bomLineRepository.findAllByBomIdOrderBySortOrderAscBomLineIdAsc(bomId);
    }

    BomResponse toResponse(BomHeader header) {
        return toResponse(header, lines(header.getBomId()));
    }

    static BomResponse toResponse(BomHeader header, List<BomLine> lines) {
        return new BomResponse(
            header.getBomId(),
            header.getProjectId(),
            header.getTargetItemId(),
            header.getBomName(),
            header.getBomVersion(),
            header.getBaseQuantity(),
            header.getBaseUnit(),
            header.getBomStatus(),
            header.getApprovedBy(),
            header.getApprovedAt(),
            header.getNote(),
            lines.stream().map(line -> new BomLineResponse(
                line.getBomLineId(),
                line.getChildItemId(),
                line.getQuantity(),
                line.getUnit(),
                line.getScrapRate(),
                line.getOptionalYn(),
                line.getSubstituteGroup(),
                line.getSortOrder(),
                line.getNote()
            )).toList()
        );
    }

    static void requirePositive(BigDecimal value, String label) {
        if (value == null || value.signum() <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, label + " must be greater than 0.");
        }
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }
}
