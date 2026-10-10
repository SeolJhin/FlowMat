package org.myweb.flowmat.domain.production.application;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.production.application.publicapi.WorkOrderQuery;
import org.myweb.flowmat.domain.production.application.publicapi.WorkOrderView;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.myweb.flowmat.domain.production.domain.enums.WorkOrderStatus;
import org.myweb.flowmat.domain.production.repository.WorkOrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkOrderQueryImpl implements WorkOrderQuery {

    private static final String NOT_DELETED = "N";

    private final WorkOrderRepository workOrderRepository;

    @Override
    public Optional<WorkOrderView> findProjectWorkOrder(String projectId, String workOrderId) {
        return workOrderRepository.findByWorkOrderIdAndDeletedYn(workOrderId, NOT_DELETED)
            .filter(order -> Objects.equals(projectId, order.getProjectId()))
            .map(WorkOrderQueryImpl::view);
    }

    @Override
    public Map<String, WorkOrderView> findWorkOrders(Collection<String> workOrderIds) {
        if (workOrderIds.isEmpty()) {
            // Unlike Map.of(), an empty map answers a lookup of a null id with null, as the collected map does.
            return Collections.emptyMap();
        }
        return workOrderRepository.findAllById(workOrderIds).stream()
            .collect(Collectors.toMap(WorkOrder::getWorkOrderId, WorkOrderQueryImpl::view));
    }

    private static WorkOrderView view(WorkOrder order) {
        return new WorkOrderView(order.getWorkOrderId(), order.getProjectId(), order.getWorkOrderNumber(),
            order.getWorkOrderStatus(), WorkOrderStatus.fromCode(order.getWorkOrderStatus()).acceptsRuns(), order.getBomId(),
            order.getTargetItemId(), order.getTargetQuantity(), order.getPlannedStartAt());
    }
}
