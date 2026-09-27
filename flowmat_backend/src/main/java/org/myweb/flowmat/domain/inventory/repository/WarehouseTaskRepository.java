package org.myweb.flowmat.domain.inventory.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.inventory.domain.entity.WarehouseTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WarehouseTaskRepository extends JpaRepository<WarehouseTask, String> {

    List<WarehouseTask> findAllByProjectIdOrderByCreatedAtDesc(String projectId);

    List<WarehouseTask> findAllByProjectIdAndStatus(String projectId, String status);

    long countByProjectId(String projectId);

    /** Locks the task so two people doing it at once cannot both move the stock. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from WarehouseTask t where t.taskId = :id")
    Optional<WarehouseTask> findForUpdate(@Param("id") String taskId);

    /** Holds a lock on a key until the transaction ends; planning tasks in a project takes turns. */
    @Query(value = "select 1 from pg_advisory_xact_lock(hashtext(:key))", nativeQuery = true)
    Integer lockKey(@Param("key") String key);
}
