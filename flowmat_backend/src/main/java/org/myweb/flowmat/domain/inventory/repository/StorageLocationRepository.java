package org.myweb.flowmat.domain.inventory.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.StorageLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StorageLocationRepository extends JpaRepository<StorageLocation, String> {

    List<StorageLocation> findAllByProjectIdAndDeletedYn(String projectId, String deletedYn);

    Optional<StorageLocation> findByLocationIdAndDeletedYn(String locationId, String deletedYn);

    List<StorageLocation> findAllByParentLocationIdAndDeletedYn(String parentLocationId, String deletedYn);

    boolean existsByParentLocationIdAndDeletedYn(String parentLocationId, String deletedYn);

    @Query("""
        select l from StorageLocation l
        where l.projectId = :projectId and l.deletedYn = 'N' and lower(l.locationCode) = lower(:code)
        """)
    Optional<StorageLocation> findLiveByCode(@Param("projectId") String projectId, @Param("code") String code);
}
