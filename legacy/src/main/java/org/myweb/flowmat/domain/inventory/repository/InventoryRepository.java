package org.myweb.flowmat.domain.inventory.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, String> {

    List<Inventory> findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(String projectId, String deletedYn);

    Optional<Inventory> findByInventoryIdAndDeletedYn(String inventoryId, String deletedYn);
}
