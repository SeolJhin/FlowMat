package org.myweb.flowmat.domain.project.repository;

import org.myweb.flowmat.domain.project.domain.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, String> {
}
