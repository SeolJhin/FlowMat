package org.myweb.flowmat.domain.production.repository;

import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRunRepository extends JpaRepository<ProductionRun, String> {
}
