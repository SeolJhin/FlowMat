package org.myweb.flowmat.domain.inventory.repository;

import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LotMasterRepository extends JpaRepository<LotMaster, String> {
}
