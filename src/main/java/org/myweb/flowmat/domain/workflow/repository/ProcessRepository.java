package org.myweb.flowmat.domain.workflow.repository;

import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessRepository extends JpaRepository<Process, String> {
}
