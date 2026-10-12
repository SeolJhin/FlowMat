package org.myweb.flowmat.domain.project.application;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.publicapi.ProjectMemberQuery;
import org.myweb.flowmat.domain.project.repository.ProjectMemberRepository;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectMemberQueryImpl implements ProjectMemberQuery {

    private static final String ACTIVE = "active";

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;

    @Override
    public boolean isActiveMember(String projectId, String userId) {
        return projectMemberRepository.existsByProjectIdAndUserIdAndMemberStatus(projectId, userId, ACTIVE);
    }

    @Override
    public boolean canRead(String projectId, String userId) {
        if (projectId == null || userId == null) {
            return false;
        }
        return projectRepository.findByProjectIdAndDeletedYn(projectId, "N")
            .map(project -> userId.equals(project.getOwnerId()) || isActiveMember(projectId, userId))
            .orElse(false);
    }

    @Override
    public String ownerOf(String projectId) {
        return projectId == null ? null
            : projectRepository.findByProjectIdAndDeletedYn(projectId, "N").map(project -> project.getOwnerId()).orElse(null);
    }
}
