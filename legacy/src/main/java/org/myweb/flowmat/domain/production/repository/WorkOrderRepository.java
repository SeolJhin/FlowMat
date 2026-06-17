package org.myweb.flowmat.domain.production.repository;

import org.myweb.flowmat.domain.production.domain.entity.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, String> {
}
