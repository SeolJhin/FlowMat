package org.myweb.flowmat.domain.production.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.production.domain.entity.RunInstructionCheck;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RunInstructionCheckRepository extends JpaRepository<RunInstructionCheck, String> {

    List<RunInstructionCheck> findAllByProductionRunId(String productionRunId);

    Optional<RunInstructionCheck> findByProductionRunIdAndStepId(String productionRunId, String stepId);
}
