package org.myweb.flowmat.domain.inventory.application;

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
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.inventory.api.dto.request.LotCreateRequest;
import org.myweb.flowmat.domain.inventory.api.dto.response.LotResponse;
import org.myweb.flowmat.domain.inventory.api.dto.response.LotTraceResponse;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.inventory.domain.entity.LotTrace;
import org.myweb.flowmat.domain.inventory.domain.enums.LotStatus;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.myweb.flowmat.domain.inventory.repository.LotMasterRepository;
import org.myweb.flowmat.domain.inventory.repository.LotTraceRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LotServiceImpl implements LotService {

    private static final String NOT_DELETED = "N";
    /** Genealogy deeper than this is almost certainly a cycle in bad data; stop rather than loop. */
    private static final int MAX_TRACE_DEPTH = 50;

    private final LotMasterRepository lotMasterRepository;
    private final LotTraceRepository lotTraceRepository;
    private final InventoryRepository inventoryRepository;
    private final ItemRepository itemRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    @Override
    @Transactional
    public LotResponse createLot(LotCreateRequest request) {
        String projectId = request.projectId().trim();
        projectAccessService.requireProjectWriteAccess(projectId);
        Item item = itemRepository.findByItemIdAndDeletedYn(request.itemId().trim(), NOT_DELETED)
            .filter(found -> projectId.equals(found.getProjectId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "Item does not exist in this project."));
        if (!"Y".equals(item.getLotManageYn())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                item.getItemCode() + " is not LOT-tracked. Turn on LOT tracking for the item first.");
        }
        String lotNo = request.lotNo().trim();
        if (lotMasterRepository.existsByProjectIdAndLotNoIgnoreCase(projectId, lotNo)) {
            throw new BusinessException(ErrorCode.CONFLICT, "LOT " + lotNo + " already exists in this project.");
        }

        LotMaster lot = new LotMaster();
        lot.setLotId(idGenerator.generate());
        lot.setProjectId(projectId);
        lot.setItemId(item.getItemId());
        lot.setLotNo(lotNo);
        lot.setSerialNo(request.serialNo() == null || request.serialNo().isBlank() ? null : request.serialNo().trim());
        lot.setReceivedAt(request.receivedAt());
        lot.setExpiryDate(request.expiryDate());
        lot.setLotStatus(LotStatus.AVAILABLE.code());
        return toResponse(lotMasterRepository.saveAndFlush(lot), List.of());
    }

    @Override
    public List<LotResponse> listLots(String projectId, String itemId) {
        if (projectId == null || projectId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "projectId is required.");
        }
        projectAccessService.requireProjectReadAccess(projectId.trim());
        List<LotMaster> lots = itemId == null || itemId.isBlank()
            ? lotMasterRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId.trim())
            : lotMasterRepository.findAllByProjectIdAndItemIdOrderByCreatedAtDesc(projectId.trim(), itemId.trim());
        return lots.stream().map(this::toResponse).toList();
    }

    @Override
    public LotResponse getLot(String lotId) {
        LotMaster lot = findLot(lotId);
        projectAccessService.requireProjectReadAccess(lot.getProjectId());
        return toResponse(lot);
    }

    @Override
    @Transactional
    public LotResponse closeLot(String lotId) {
        LotMaster lot = findLot(lotId);
        projectAccessService.requireProjectOwnerAccess(lot.getProjectId());
        List<Inventory> stock = inventoryRepository.findAllByLotIdAndDeletedYn(lotId, NOT_DELETED);
        BigDecimal onHand = sum(stock, Inventory::getQuantity);
        if (onHand.signum() != 0) {
            throw new BusinessException(ErrorCode.CONFLICT,
                "LOT " + lot.getLotNo() + " still holds " + InventoryCommandService.plain(onHand) + ". Issue it before closing.");
        }
        lot.setLotStatus(LotStatus.CLOSED.code());
        return toResponse(lotMasterRepository.save(lot), stock);
    }

    @Override
    public LotTraceResponse trace(String lotId, String direction) {
        LotMaster start = findLot(lotId);
        projectAccessService.requireProjectReadAccess(start.getProjectId());
        boolean backward = !"forward".equalsIgnoreCase(direction == null ? "" : direction.trim());

        List<LotTraceResponse.Node> nodes = new ArrayList<>();
        Set<String> visited = new HashSet<>(Set.of(start.getLotId()));
        List<String> frontier = List.of(start.getLotId());
        for (int depth = 1; !frontier.isEmpty() && depth <= MAX_TRACE_DEPTH; depth++) {
            List<LotTrace> edges = backward
                ? lotTraceRepository.findAllByChildLotIdIn(frontier)
                : lotTraceRepository.findAllByParentLotIdIn(frontier);
            List<String> next = new ArrayList<>();
            Map<String, LotMaster> reached = lotMasterRepository.findAllById(edges.stream()
                    .map(edge -> backward ? edge.getParentLotId() : edge.getChildLotId()).toList())
                .stream().collect(Collectors.toMap(LotMaster::getLotId, Function.identity()));
            for (LotTrace edge : edges) {
                String otherId = backward ? edge.getParentLotId() : edge.getChildLotId();
                LotMaster other = reached.get(otherId);
                if (other == null || !visited.add(otherId)) {
                    continue;
                }
                nodes.add(new LotTraceResponse.Node(
                    toResponse(other),
                    depth,
                    backward ? edge.getChildLotId() : edge.getParentLotId(),
                    edge.getProductionRunId(),
                    edge.getConsumedQty(),
                    edge.getProducedQty(),
                    edge.getUnit()
                ));
                next.add(otherId);
            }
            frontier = next;
        }
        return new LotTraceResponse(toResponse(start), backward ? "backward" : "forward", nodes);
    }

    @Override
    public LotMaster requireLotForStock(String lotId, String projectId, String itemId) {
        LotMaster lot = lotMasterRepository.findById(lotId)
            .orElseThrow(() -> new BusinessException(ErrorCode.BAD_REQUEST, "LOT does not exist."));
        if (!projectId.equals(lot.getProjectId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "LOT " + lot.getLotNo() + " belongs to another project.");
        }
        if (!itemId.equals(lot.getItemId())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "LOT " + lot.getLotNo() + " is for a different item.");
        }
        LotStatus status = LotStatus.fromCode(lot.getLotStatus());
        if (status == LotStatus.CLOSED || status == LotStatus.QUARANTINED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "LOT " + lot.getLotNo() + " is " + status.code() + ".");
        }
        return lot;
    }

    @Override
    @Transactional
    public void recordTrace(
        String projectId,
        String productionRunId,
        String processId,
        String parentLotId,
        String childLotId,
        BigDecimal consumedQty,
        BigDecimal producedQty,
        String unit
    ) {
        if (parentLotId.equals(childLotId)
            || lotTraceRepository.existsByParentLotIdAndChildLotIdAndProductionRunId(parentLotId, childLotId, productionRunId)) {
            return;
        }
        LotTrace trace = new LotTrace();
        trace.setLotTraceId(idGenerator.generate());
        trace.setProjectId(projectId);
        trace.setParentLotId(parentLotId);
        trace.setChildLotId(childLotId);
        trace.setProductionRunId(productionRunId);
        trace.setProcessId(processId);
        trace.setConsumedQty(consumedQty);
        trace.setProducedQty(producedQty);
        trace.setUnit(unit);
        trace.setCreatedAt(OffsetDateTime.now());
        lotTraceRepository.save(trace);
    }

    @Override
    @Transactional
    public void markProducedBy(String lotId, String productionRunId) {
        lotMasterRepository.findById(lotId).ifPresent(lot -> {
            if (lot.getProductionRunId() == null) {
                lot.setProductionRunId(productionRunId);
                lot.setProducedAt(OffsetDateTime.now());
                lotMasterRepository.save(lot);
            }
        });
    }

    @Override
    @Transactional
    public void clearProducedBy(String lotId, String productionRunId) {
        lotMasterRepository.findById(lotId).ifPresent(lot -> {
            if (productionRunId.equals(lot.getProductionRunId())) {
                lot.setProductionRunId(null);
                lot.setProducedAt(null);
                lotMasterRepository.save(lot);
            }
        });
    }

    @Override
    @Transactional
    public void clearRunTrace(String productionRunId) {
        lotTraceRepository.deleteAllByProductionRunId(productionRunId);
    }

    private LotMaster findLot(String lotId) {
        return lotMasterRepository.findById(lotId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private LotResponse toResponse(LotMaster lot) {
        return toResponse(lot, inventoryRepository.findAllByLotIdAndDeletedYn(lot.getLotId(), NOT_DELETED));
    }

    private static LotResponse toResponse(LotMaster lot, List<Inventory> stock) {
        return new LotResponse(
            lot.getLotId(),
            lot.getProjectId(),
            lot.getItemId(),
            lot.getLotNo(),
            lot.getSerialNo(),
            lot.getLotStatus(),
            lot.getReceivedAt(),
            lot.getProducedAt(),
            lot.getExpiryDate(),
            lot.getProductionRunId(),
            sum(stock, Inventory::getQuantity),
            sum(stock, Inventory::getReservedQuantity)
        );
    }

    private static BigDecimal sum(List<Inventory> stock, Function<Inventory, BigDecimal> field) {
        return stock.stream()
            .map(field)
            .map(value -> value == null ? BigDecimal.ZERO : value)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
