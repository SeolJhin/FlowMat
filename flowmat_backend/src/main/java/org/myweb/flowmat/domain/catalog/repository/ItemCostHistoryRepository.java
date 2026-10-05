package org.myweb.flowmat.domain.catalog.repository;

import java.util.List;
import org.myweb.flowmat.domain.catalog.domain.entity.ItemCostHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemCostHistoryRepository extends JpaRepository<ItemCostHistory, String> {

    List<ItemCostHistory> findAllByItemIdOrderByChangedAtDesc(String itemId);
}
