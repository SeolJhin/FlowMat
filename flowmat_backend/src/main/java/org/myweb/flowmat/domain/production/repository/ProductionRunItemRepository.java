package org.myweb.flowmat.domain.production.repository;

import java.util.List;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRunItemRepository extends JpaRepository<ProductionRunItem, String> {

    List<ProductionRunItem> findAllByProductionRunIdOrderByProductionRunItemIdAsc(String productionRunId);

    /** Recordings of one LOT in one direction across runs, e.g. the runs that consumed it. */
    List<ProductionRunItem> findAllByLotIdAndDirection(String lotId, String direction);
}
