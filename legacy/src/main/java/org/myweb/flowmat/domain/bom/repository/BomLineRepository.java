package org.myweb.flowmat.domain.bom.repository;

import org.myweb.flowmat.domain.bom.domain.entity.BomLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BomLineRepository extends JpaRepository<BomLine, String> {
}
