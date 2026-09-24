package org.myweb.flowmat.domain.flowrun.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunStepAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlowRunStepAttemptRepository extends JpaRepository<FlowRunStepAttempt, String> {
    List<FlowRunStepAttempt> findAllByStepIdOrderByAttemptNoAsc(String stepId);
    Optional<FlowRunStepAttempt> findTopByStepIdOrderByAttemptNoDesc(String stepId);
}
