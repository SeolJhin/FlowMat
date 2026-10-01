package org.myweb.flowmat.domain.flowrun.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStep;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlowRunStepRepository extends JpaRepository<FlowRunStep, String> {
    List<FlowRunStep> findAllByFlowRunIdOrderBySequenceNoAsc(String flowRunId);
    Optional<FlowRunStep> findByStepIdAndFlowRunId(String stepId, String flowRunId);
    boolean existsByFlowRunIdAndStatusNot(String flowRunId, String status);
    boolean existsByFlowRunIdAndStatusNotIn(String flowRunId, Set<String> statuses);
    long countByFlowRunId(String flowRunId);
}
