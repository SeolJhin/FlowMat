package org.myweb.flowmat.domain.project.application;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.publicapi.ProjectMemberQuery;
import org.myweb.flowmat.domain.project.repository.ProjectMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectMemberQueryImpl implements ProjectMemberQuery {

    private static final String ACTIVE = "active";

    private final ProjectMemberRepository projectMemberRepository;

    @Override
    public boolean isActiveMember(String projectId, String userId) {
        return projectMemberRepository.existsByProjectIdAndUserIdAndMemberStatus(projectId, userId, ACTIVE);
    }
}
