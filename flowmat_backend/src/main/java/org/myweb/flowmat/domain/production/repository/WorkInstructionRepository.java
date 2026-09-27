package org.myweb.flowmat.domain.production.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.production.domain.entity.WorkInstruction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkInstructionRepository extends JpaRepository<WorkInstruction, String> {

    List<WorkInstruction> findAllByProjectIdAndDeletedYnOrderByItemIdAscRevisionNoDesc(String projectId, String deletedYn);

    List<WorkInstruction> findAllByItemIdAndDeletedYnOrderByRevisionNoDesc(String itemId, String deletedYn);

    Optional<WorkInstruction> findByInstructionIdAndDeletedYn(String instructionId, String deletedYn);

    Optional<WorkInstruction> findFirstByItemIdAndStatusAndDeletedYn(String itemId, String status, String deletedYn);
}
