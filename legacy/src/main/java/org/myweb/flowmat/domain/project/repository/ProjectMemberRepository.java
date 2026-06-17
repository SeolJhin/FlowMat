package org.myweb.flowmat.domain.project.repository;

import org.myweb.flowmat.domain.project.domain.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, String> {
}
