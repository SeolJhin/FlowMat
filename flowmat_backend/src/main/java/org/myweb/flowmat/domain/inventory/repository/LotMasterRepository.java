package org.myweb.flowmat.domain.inventory.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LotMasterRepository extends JpaRepository<LotMaster, String> {

    boolean existsByProjectIdAndLotNoIgnoreCase(String projectId, String lotNo);

    List<LotMaster> findAllByProjectIdOrderByCreatedAtDesc(String projectId);

    List<LotMaster> findAllByProjectIdAndItemIdOrderByCreatedAtDesc(String projectId, String itemId);

    /** Locks the LOT row until the transaction ends, so two re-checks of its status take turns (LotStatusResync). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LotMaster l where l.lotId = :lotId")
    Optional<LotMaster> findForUpdate(@Param("lotId") String lotId);
}
