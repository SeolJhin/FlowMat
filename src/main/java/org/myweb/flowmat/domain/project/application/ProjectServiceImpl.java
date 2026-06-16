package org.myweb.flowmat.domain.project.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.api.dto.request.ProjectCreateRequest;
import org.myweb.flowmat.domain.project.api.dto.request.ProjectUpdateRequest;
import org.myweb.flowmat.domain.project.api.dto.response.ProjectResponse;
import org.myweb.flowmat.domain.project.api.dto.response.ProjectSummaryResponse;
import org.myweb.flowmat.domain.project.domain.entity.Project;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectServiceImpl implements ProjectService {

    private static final String NOT_DELETED = "N";
    private static final String DELETED = "Y";

    private final ProjectRepository projectRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<ProjectSummaryResponse> listProjects() {
        return projectRepository.findAllByDeletedYnOrderByCreatedAtDesc(NOT_DELETED).stream()
            .map(ProjectServiceImpl::toSummaryResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProjectResponse createProject(ProjectCreateRequest request) {
        Project project = new Project();
        project.setProjectId(idGenerator.generate());
        project.setProjectName(request.projectName().trim());
        project.setOwnerId(request.ownerId().trim());
        project.setProjectDesc(trimToNull(request.projectDesc()));
        project.setProjectStatus("active");
        project.setVisibility(defaultIfBlank(request.visibility(), "private"));
        project.setDeletedYn(NOT_DELETED);
        return toResponse(projectRepository.save(project));
    }

    @Override
    public ProjectResponse getProject(String projectId) {
        return toResponse(findActiveProject(projectId));
    }

    @Override
    @Transactional
    public ProjectResponse updateProject(String projectId, ProjectUpdateRequest request) {
        Project project = findActiveProject(projectId);
        if (hasText(request.projectName())) {
            project.setProjectName(request.projectName().trim());
        }
        if (request.projectDesc() != null) {
            project.setProjectDesc(trimToNull(request.projectDesc()));
        }
        if (hasText(request.visibility())) {
            project.setVisibility(request.visibility().trim().toLowerCase());
        }
        return toResponse(projectRepository.save(project));
    }

    @Override
    @Transactional
    public void deleteProject(String projectId) {
        Project project = findActiveProject(projectId);
        project.setDeletedYn(DELETED);
        project.setProjectStatus("deleted");
        projectRepository.save(project);
    }

    private Project findActiveProject(String projectId) {
        return projectRepository.findByProjectIdAndDeletedYn(projectId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
            project.getProjectId(),
            project.getProjectName(),
            project.getProjectDesc(),
            project.getProjectStatus(),
            project.getVisibility(),
            project.getCurrentWorkflowId()
        );
    }

    private static ProjectSummaryResponse toSummaryResponse(Project project) {
        return new ProjectSummaryResponse(
            project.getProjectId(),
            project.getProjectName(),
            project.getProjectStatus()
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return hasText(value) ? value.trim().toLowerCase() : defaultValue;
    }
}
