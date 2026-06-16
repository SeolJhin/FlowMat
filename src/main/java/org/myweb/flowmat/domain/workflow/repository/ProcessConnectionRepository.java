package org.myweb.flowmat.domain.workflow.repository;

import java.util.List;
import java.util.Optional;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessConnection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessConnectionRepository extends JpaRepository<ProcessConnection, String> {

    List<ProcessConnection> findAllByWorkflowIdAndDeletedYnOrderByCreatedAtAsc(String workflowId, String deletedYn);

    Optional<ProcessConnection> findByConnectionIdAndDeletedYn(String connectionId, String deletedYn);
}
