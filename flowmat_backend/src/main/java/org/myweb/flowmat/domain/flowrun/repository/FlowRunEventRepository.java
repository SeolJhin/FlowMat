package org.myweb.flowmat.domain.flowrun.repository;

import java.util.List;
import org.myweb.flowmat.domain.flowrun.domain.entity.FlowRunEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlowRunEventRepository extends JpaRepository<FlowRunEvent, String> {
    List<FlowRunEvent> findAllByFlowRunIdOrderByOccurredAtAscEventIdAsc(String flowRunId);
}
