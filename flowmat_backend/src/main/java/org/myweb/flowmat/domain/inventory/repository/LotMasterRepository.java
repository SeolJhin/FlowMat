package org.myweb.flowmat.domain.inventory.repository;

import java.util.List;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LotMasterRepository extends JpaRepository<LotMaster, String> {

    boolean existsByProjectIdAndLotNoIgnoreCase(String projectId, String lotNo);

    List<LotMaster> findAllByProjectIdOrderByCreatedAtDesc(String projectId);

    List<LotMaster> findAllByProjectIdAndItemIdOrderByCreatedAtDesc(String projectId, String itemId);
}
