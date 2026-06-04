package org.myweb.flowmat.domain.workflow.repository;

import org.myweb.flowmat.domain.workflow.domain.entity.ProcessConnection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessConnectionRepository extends JpaRepository<ProcessConnection, String> {
}
