package org.myweb.flowmat.domain.bom.repository;

import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BomHeaderRepository extends JpaRepository<BomHeader, String> {
}
