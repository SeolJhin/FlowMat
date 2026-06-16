package org.myweb.flowmat.domain.catalog.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, String> {

    List<Item> findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(String projectId, String deletedYn);

    Optional<Item> findByItemIdAndDeletedYn(String itemId, String deletedYn);
}
