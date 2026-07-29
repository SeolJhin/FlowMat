package org.myweb.flowmat.domain.project.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.project.api.dto.request.ProjectMemberRoleUpdateRequest;
import org.myweb.flowmat.domain.project.api.dto.response.ProjectMemberResponse;
import org.myweb.flowmat.domain.project.domain.entity.ProjectMember;
import org.myweb.flowmat.domain.project.repository.ProjectMemberRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;

@ExtendWith(MockitoExtension.class)
class ProjectMemberServiceTest {

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private ProjectAccessService projectAccessService;

    @InjectMocks
    private ProjectMemberServiceImpl projectMemberService;

    @Test
    void listMembersReturnsActiveMembers() {
        ProjectMember member = member("pm-1", "project-1", "user-1", "viewer", "active");
        when(projectMemberRepository.findAllByProjectIdAndMemberStatusOrderByCreatedAtAsc("project-1", "active"))
            .thenReturn(List.of(member));

        List<ProjectMemberResponse> response = projectMemberService.listMembers("project-1");

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().projectMemberId()).isEqualTo("pm-1");
    }

    @Test
    void updateMemberRoleChangesRole() {
        ProjectMember member = member("pm-2", "project-2", "user-2", "viewer", "active");
        when(projectMemberRepository.findByProjectMemberIdAndMemberStatus("pm-2", "active"))
            .thenReturn(Optional.of(member));
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectMemberResponse response = projectMemberService.updateMemberRole(
            "pm-2",
            new ProjectMemberRoleUpdateRequest("editor")
        );

        assertThat(response.projectRole()).isEqualTo("editor");
    }

    @Test
    void removeMemberMarksMemberRemoved() {
        ProjectMember member = member("pm-3", "project-3", "user-3", "editor", "active");
        when(projectMemberRepository.findByProjectMemberIdAndMemberStatus("pm-3", "active"))
            .thenReturn(Optional.of(member));
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectMemberService.removeMember("pm-3");

        assertThat(member.getMemberStatus()).isEqualTo("removed");
    }

    @Test
    void removeOwnerMemberIsRejected() {
        ProjectMember member = member("pm-4", "project-4", "owner-4", "owner", "active");
        when(projectMemberRepository.findByProjectMemberIdAndMemberStatus("pm-4", "active"))
            .thenReturn(Optional.of(member));

        assertThatThrownBy(() -> projectMemberService.removeMember("pm-4"))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.BAD_REQUEST);
    }

    private static ProjectMember member(String id, String projectId, String userId, String role, String status) {
        ProjectMember member = new ProjectMember();
        member.setProjectMemberId(id);
        member.setProjectId(projectId);
        member.setUserId(userId);
        member.setProjectRole(role);
        member.setMemberStatus(status);
        member.setJoinedAt(OffsetDateTime.now());
        return member;
    }
}
