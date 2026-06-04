package org.myweb.flowmat.domain.catalog.repository;

import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, String> {
}
