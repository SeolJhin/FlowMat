package org.myweb.flowmat.domain.production.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, String> {

    List<WorkOrder> findAllByProjectIdAndDeletedYnOrderByCreatedAtDesc(String projectId, String deletedYn);

    Optional<WorkOrder> findByWorkOrderIdAndDeletedYn(String workOrderId, String deletedYn);

    boolean existsByWorkOrderNumber(String workOrderNumber);
}
