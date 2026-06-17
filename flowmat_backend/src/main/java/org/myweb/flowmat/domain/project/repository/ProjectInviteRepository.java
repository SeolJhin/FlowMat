package org.myweb.flowmat.domain.project.repository;

import org.myweb.flowmat.domain.project.domain.entity.ProjectInvite;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectInviteRepository extends JpaRepository<ProjectInvite, String> {
}
