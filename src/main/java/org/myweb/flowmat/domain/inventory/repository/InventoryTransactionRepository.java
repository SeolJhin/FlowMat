package org.myweb.flowmat.domain.inventory.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, String> {

    List<InventoryTransaction> findAllByProjectIdOrderByCreatedAtDesc(String projectId);

    List<InventoryTransaction> findAllByInventoryIdOrderByCreatedAtDesc(String inventoryId);

    Optional<InventoryTransaction> findByInventoryTransactionId(String inventoryTransactionId);
}
