package org.myweb.flowmat.domain.catalog.repository;

import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<Equipment, String> {
}
