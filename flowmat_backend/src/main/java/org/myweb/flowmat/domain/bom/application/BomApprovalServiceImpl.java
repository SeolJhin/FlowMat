package org.myweb.flowmat.domain.bom.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BomApprovalServiceImpl implements BomApprovalService {

    private static final String NOT_DELETED = BomServiceImpl.NOT_DELETED;

    private final BomHeaderRepository bomHeaderRepository;
    private final BomLineRepository bomLineRepository;
    private final ItemRepository itemRepository;
    private final UnitConverter unitConverter;
    private final ProjectAccessService projectAccessService;

    @Override
    public BomResponse submit(String bomId) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectWriteAccess(header.getProjectId());
        List<BomLine> lines = lines(header);
        // Check now so the approver only sees revisions that can pass; approval checks again.
        requireApprovable(header, lines);
        transition(header, BomStatus.PENDING_APPROVAL);
        header.setApprovalStatus("pending");
        header.setUpdatedBy(projectAccessService.requireCurrentUserId());
        return BomServiceImpl.toResponse(bomHeaderRepository.save(header), lines);
    }

    @Override
    public BomResponse approve(String bomId, String note) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectOwnerAccess(header.getProjectId());
        List<BomLine> lines = lines(header);
        requireApprovable(header, lines);
        transition(header, BomStatus.APPROVED);
        String actor = projectAccessService.requireCurrentUserId();

        // One approved revision per item: approving v(n) retires the previous approved revision.
        for (BomHeader previous : bomHeaderRepository.findAllByProjectIdAndTargetItemIdAndDeletedYnOrderByBomVersionDesc(
            header.getProjectId(), header.getTargetItemId(), NOT_DELETED)) {
            if (!previous.getBomId().equals(header.getBomId())
                && BomStatus.fromCode(previous.getBomStatus()) == BomStatus.APPROVED) {
                previous.setBomStatus(BomStatus.RETIRED.code());
                previous.setUpdatedBy(actor);
                appendNote(previous, "Retired by approval of v" + header.getBomVersion() + ".");
                bomHeaderRepository.save(previous);
            }
        }

        header.setApprovalStatus("approved");
        header.setApprovedBy(actor);
        header.setApprovedAt(OffsetDateTime.now());
        header.setUpdatedBy(actor);
        appendNote(header, note);
        return BomServiceImpl.toResponse(bomHeaderRepository.save(header), lines);
    }

    @Override
    public BomResponse reject(String bomId, String note) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectOwnerAccess(header.getProjectId());
        if (note == null || note.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Give a reason when rejecting a BOM.");
        }
        transition(header, BomStatus.DRAFT);
        header.setApprovalStatus("rejected");
        header.setUpdatedBy(projectAccessService.requireCurrentUserId());
        appendNote(header, "Rejected: " + note.trim());
        return BomServiceImpl.toResponse(bomHeaderRepository.save(header), lines(header));
    }

    @Override
    public BomResponse retire(String bomId, String note) {
        BomHeader header = findBom(bomId);
        projectAccessService.requireProjectOwnerAccess(header.getProjectId());
        transition(header, BomStatus.RETIRED);
        header.setUpdatedBy(projectAccessService.requireCurrentUserId());
        appendNote(header, note);
        return BomServiceImpl.toResponse(bomHeaderRepository.save(header), lines(header));
    }

    /** Approval conditions 1–7 of docs/domain/inventory-bom-lot-contract.md §5; reports every violation at once. */
    void requireApprovable(BomHeader header, List<BomLine> lines) {
        List<String> problems = problems(header, lines);
        if (!problems.isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "This BOM cannot be approved: " + String.join(" ", problems));
        }
    }

    List<String> problems(BomHeader header, List<BomLine> lines) {
        List<String> problems = new ArrayList<>();
        Item target = itemRepository.findByItemIdAndDeletedYn(header.getTargetItemId(), NOT_DELETED)
            .filter(item -> header.getProjectId().equals(item.getProjectId()))
            .orElse(null);
        if (target == null) {
            problems.add("The target item no longer exists in this project.");
        }
        if (header.getBaseQuantity() == null || header.getBaseQuantity().signum() <= 0) {
            problems.add("Base quantity must be greater than 0.");
        } else if (target != null) {
            convertible(header.getBaseQuantity(), header.getBaseUnit(), target, "Base quantity", problems);
        }
        if (lines.isEmpty()) {
            problems.add("Add at least one material.");
        }

        Map<String, Item> items = itemRepository.findAllById(lines.stream().map(BomLine::getChildItemId).toList()).stream()
            .collect(Collectors.toMap(Item::getItemId, Function.identity()));
        Set<String> seen = new HashSet<>();
        for (BomLine line : lines) {
            Item child = items.get(line.getChildItemId());
            String label = child != null ? child.getItemCode() : line.getChildItemId();
            if (child == null || !"N".equals(child.getDeletedYn()) || !header.getProjectId().equals(child.getProjectId())) {
                problems.add("Material " + label + " no longer exists in this project.");
                continue;
            }
            if (line.getQuantity() == null || line.getQuantity().signum() <= 0) {
                problems.add("Material " + label + " needs a quantity greater than 0.");
            }
            if (child.getItemId().equals(header.getTargetItemId())) {
                problems.add("Material " + label + " is the item this BOM produces.");
            }
            if (!seen.add(child.getItemId())) {
                problems.add("Material " + label + " appears more than once; combine the lines.");
            }
            if (line.getSubstituteGroup() != null) {
                problems.add("Material " + label + ": substitute groups are not supported yet.");
            }
            if ("Y".equals(line.getOptionalYn())) {
                problems.add("Material " + label + ": optional materials are not supported yet.");
            }
            if (line.getScrapRate() != null && line.getScrapRate().signum() != 0) {
                problems.add("Material " + label + ": scrap rates are not supported yet.");
            }
            if (line.getQuantity() != null && line.getQuantity().signum() > 0) {
                convertible(line.getQuantity(), line.getUnit(), child, "Material " + label, problems);
            }
        }

        // Single level only: no material may have its own approved BOM, and this item may not be another BOM's material.
        List<BomHeader> otherApproved = bomHeaderRepository
            .findAllByProjectIdAndBomStatusAndDeletedYn(header.getProjectId(), BomStatus.APPROVED.code(), NOT_DELETED).stream()
            .filter(other -> !other.getTargetItemId().equals(header.getTargetItemId()))
            .toList();
        Set<String> producedByBom = otherApproved.stream().map(BomHeader::getTargetItemId).collect(Collectors.toSet());
        for (BomLine line : lines) {
            if (producedByBom.contains(line.getChildItemId())) {
                Item child = items.get(line.getChildItemId());
                problems.add("Material " + (child != null ? child.getItemCode() : line.getChildItemId())
                    + " has its own approved BOM; multi-level BOMs are not supported yet.");
            }
        }
        if (!otherApproved.isEmpty()) {
            boolean usedAsMaterial = bomLineRepository.findAllByBomIdIn(otherApproved.stream().map(BomHeader::getBomId).toList())
                .stream().anyMatch(line -> line.getChildItemId().equals(header.getTargetItemId()));
            if (usedAsMaterial) {
                problems.add("This item is a material in another approved BOM; multi-level BOMs are not supported yet.");
            }
        }
        return problems;
    }

    private void convertible(BigDecimal quantity, String unit, Item item, String label, List<String> problems) {
        try {
            unitConverter.toItemUnit(quantity, unit, item.getUnitId());
        } catch (BusinessException e) {
            problems.add(label + ": " + e.getMessage());
        }
    }

    private static void transition(BomHeader header, BomStatus next) {
        BomStatus current = BomStatus.fromCode(header.getBomStatus());
        if (!current.canTransitionTo(next)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "Revision " + header.getBomVersion() + " is " + current.code() + " and cannot become " + next.code() + ".");
        }
        header.setBomStatus(next.code());
    }

    private static void appendNote(BomHeader header, String note) {
        if (note == null || note.isBlank()) {
            return;
        }
        header.setNote(header.getNote() == null ? note.trim() : header.getNote() + "\n" + note.trim());
    }

    private BomHeader findBom(String bomId) {
        return bomHeaderRepository.findByBomIdAndDeletedYn(bomId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private List<BomLine> lines(BomHeader header) {
        return bomLineRepository.findAllByBomIdOrderBySortOrderAscBomLineIdAsc(header.getBomId());
    }
}
