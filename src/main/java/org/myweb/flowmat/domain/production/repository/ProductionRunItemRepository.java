package org.myweb.flowmat.domain.production.repository;

import org.myweb.flowmat.domain.production.domain.entity.ProductionRunItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductionRunItemRepository extends JpaRepository<ProductionRunItem, String> {
}
