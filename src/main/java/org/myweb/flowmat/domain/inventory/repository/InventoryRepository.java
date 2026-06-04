package org.myweb.flowmat.domain.inventory.repository;

import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, String> {
}
