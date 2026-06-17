package org.myweb.flowmat.domain.production.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRunRepository extends JpaRepository<ProductionRun, String> {

    List<ProductionRun> findAllByWorkflowIdAndDeletedYnOrderByCreatedAtDesc(String workflowId, String deletedYn);

    Optional<ProductionRun> findByProductionRunIdAndDeletedYn(String productionRunId, String deletedYn);
}
