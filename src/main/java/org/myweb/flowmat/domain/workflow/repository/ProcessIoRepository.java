package org.myweb.flowmat.domain.workflow.repository;

import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessIoRepository extends JpaRepository<ProcessIo, String> {
}
