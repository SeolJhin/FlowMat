package org.myweb.flowmat.domain.production.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductionRunRepository extends JpaRepository<ProductionRun, String> {

    /** Locks the run row so corrections of one run are requested and applied one at a time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ProductionRun r where r.productionRunId = :id and r.deletedYn = 'N'")
    Optional<ProductionRun> findForUpdate(@Param("id") String productionRunId);

    List<ProductionRun> findAllByWorkflowIdAndDeletedYnOrderByCreatedAtDesc(String workflowId, String deletedYn);

    Optional<ProductionRun> findByProductionRunIdAndDeletedYn(String productionRunId, String deletedYn);

    List<ProductionRun> findAllByWorkOrderIdInAndDeletedYn(Collection<String> workOrderIds, String deletedYn);
}
