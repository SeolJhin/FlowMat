package org.myweb.flowmat.domain.project.application;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.api.dto.request.ProjectInviteAcceptRequest;
import org.myweb.flowmat.domain.project.api.dto.request.ProjectInviteRequest;
import org.myweb.flowmat.domain.project.api.dto.response.ProjectInviteResponse;
import org.myweb.flowmat.domain.project.api.dto.response.ProjectMemberResponse;
import org.myweb.flowmat.domain.project.domain.entity.Project;
import org.myweb.flowmat.domain.project.domain.entity.ProjectInvite;
import org.myweb.flowmat.domain.project.domain.entity.ProjectMember;
import org.myweb.flowmat.domain.project.repository.ProjectInviteRepository;
import org.myweb.flowmat.domain.project.repository.ProjectMemberRepository;
import org.myweb.flowmat.domain.project.repository.ProjectRepository;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.myweb.flowmat.global.mail.MailService;
import org.myweb.flowmat.global.slack.SlackNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectInviteServiceImpl implements ProjectInviteService {

    private static final String ACTIVE_MEMBER = "active";
    private static final String NOT_DELETED = "N";
    private static final String INVITE_PENDING = "pending";
    private static final String INVITE_ACCEPTED = "accepted";
    private static final String INVITE_CANCELED = "canceled";
    private static final List<String> ASSIGNABLE_ROLES = List.of("viewer", "editor");

    private final ProjectInviteRepository projectInviteRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAccessService projectAccessService;
    private final UserRepository userRepository;
    private final IdGenerator idGenerator;
    private final MailService mailService;
    private final SlackNotificationService slackNotificationService;

    @Override
    public List<ProjectInviteResponse> listInvites(String projectId) {
        projectAccessService.requireProjectOwnerAccess(projectId);
        return projectInviteRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
            .map(ProjectInviteServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public ProjectInviteResponse createInvite(ProjectInviteRequest request) {
        Project project = projectAccessService.requireProjectOwnerAccess(request.projectId().trim());
        String invitedEmail = request.invitedEmail().trim().toLowerCase();
        String role = normalizeAssignableRole(request.projectRole());

        if (projectInviteRepository.existsByProjectIdAndInvitedEmailIgnoreCaseAndInviteStatus(
            project.getProjectId(),
            invitedEmail,
            INVITE_PENDING
        )) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A pending invite already exists for this email.");
        }
        if (invitedEmail.equalsIgnoreCase(resolveCurrentUser().getUserEmail())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "You cannot invite yourself.");
        }

        User invitedUser = userRepository.findByUserEmail(invitedEmail).orElse(null);
        if (invitedUser != null) {
            if (project.getOwnerId().equals(invitedUser.getUserId())) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The project owner already has access.");
            }
            if (projectMemberRepository.existsByProjectIdAndUserIdAndMemberStatus(
                project.getProjectId(),
                invitedUser.getUserId(),
                ACTIVE_MEMBER
            )) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "The user is already an active project member.");
            }
        }

        ProjectInvite invite = new ProjectInvite();
        invite.setInviteId(idGenerator.generate());
        invite.setProjectId(project.getProjectId());
        invite.setInvitedEmail(invitedEmail);
        invite.setInvitedUserId(invitedUser != null ? invitedUser.getUserId() : null);
        invite.setProjectRole(role);
        invite.setInviteStatus(INVITE_PENDING);
        invite.setInviteToken(UUID.randomUUID().toString());
        invite.setInvitedBy(projectAccessService.requireCurrentUserId());
        invite.setExpiredAt(OffsetDateTime.now().plusDays(7));

        ProjectInviteResponse saved = toResponse(projectInviteRepository.save(invite));

        String inviterName = resolveCurrentUser().getUserName();
        mailService.sendProjectInvite(invitedEmail, project.getProjectName(), inviterName, saved.inviteToken(), role);
        slackNotificationService.sendProjectInviteAlert(project.getProjectName(), inviterName, invitedEmail, role);

        return saved;
    }

    @Override
    @Transactional
    public ProjectMemberResponse acceptInvite(ProjectInviteAcceptRequest request) {
        ProjectInvite invite = projectInviteRepository.findByInviteToken(request.inviteToken().trim())
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Invite token was not found."));
        if (!INVITE_PENDING.equalsIgnoreCase(invite.getInviteStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "This invite is no longer pending.");
        }
        if (invite.getExpiredAt() != null && invite.getExpiredAt().isBefore(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "This invite has expired.");
        }

        User currentUser = resolveCurrentUser();
        if (!currentUser.getUserEmail().equalsIgnoreCase(invite.getInvitedEmail())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "This invite is not addressed to the authenticated user.");
        }

        Project project = projectRepository.findByProjectIdAndDeletedYn(invite.getProjectId(), NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserIdAndMemberStatus(
                project.getProjectId(),
                currentUser.getUserId(),
                ACTIVE_MEMBER
            )
            .orElseGet(() -> createAcceptedMember(project, invite, currentUser));

        invite.setInvitedUserId(currentUser.getUserId());
        invite.setInviteStatus(INVITE_ACCEPTED);
        invite.setAcceptedAt(OffsetDateTime.now());
        projectInviteRepository.save(invite);

        return toMemberResponse(member);
    }

    @Override
    @Transactional
    public void cancelInvite(String inviteId) {
        ProjectInvite invite = projectInviteRepository.findById(inviteId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        projectAccessService.requireProjectOwnerAccess(invite.getProjectId());
        if (!INVITE_PENDING.equalsIgnoreCase(invite.getInviteStatus())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Only pending invites can be canceled.");
        }
        invite.setInviteStatus(INVITE_CANCELED);
        projectInviteRepository.save(invite);
    }

    private ProjectMember createAcceptedMember(Project project, ProjectInvite invite, User currentUser) {
        ProjectMember member = new ProjectMember();
        member.setProjectMemberId(idGenerator.generate());
        member.setProjectId(project.getProjectId());
        member.setUserId(currentUser.getUserId());
        member.setProjectRole(normalizeAssignableRole(invite.getProjectRole()));
        member.setMemberStatus(ACTIVE_MEMBER);
        member.setInvitedBy(invite.getInvitedBy());
        member.setJoinedAt(OffsetDateTime.now());
        member.setLastAccessedAt(OffsetDateTime.now());
        return projectMemberRepository.save(member);
    }

    private User resolveCurrentUser() {
        String userId = projectAccessService.requireCurrentUserId();
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Authenticated user was not found."));
    }

    private static ProjectInviteResponse toResponse(ProjectInvite invite) {
        return new ProjectInviteResponse(
            invite.getInviteId(),
            invite.getProjectId(),
            invite.getInvitedEmail(),
            invite.getInvitedUserId(),
            invite.getProjectRole(),
            invite.getInviteStatus(),
            invite.getInviteToken(),
            invite.getAcceptedAt(),
            invite.getExpiredAt()
        );
    }

    private static ProjectMemberResponse toMemberResponse(ProjectMember member) {
        return new ProjectMemberResponse(
            member.getProjectMemberId(),
            member.getProjectId(),
            member.getUserId(),
            member.getProjectRole(),
            member.getMemberStatus(),
            member.getJoinedAt()
        );
    }

    static String normalizeAssignableRole(String role) {
        String normalized = role == null || role.isBlank() ? "viewer" : role.trim().toLowerCase();
        if (!ASSIGNABLE_ROLES.contains(normalized)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Assignable role must be viewer or editor.");
        }
        return normalized;
    }
}
