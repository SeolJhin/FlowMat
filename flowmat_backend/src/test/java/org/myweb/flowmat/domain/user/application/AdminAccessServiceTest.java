package org.myweb.flowmat.domain.user.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;

@ExtendWith(MockitoExtension.class)
class AdminAccessServiceTest {

    @Mock
    private ProjectAccessService projectAccessService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminAccessService adminAccessService;

    @Test
    void nonAdminUserIsRejected() {
        User user = new User();
        user.setUserId("user-1");
        user.setUserRole("user");
        when(projectAccessService.requireCurrentUserId()).thenReturn("user-1");
        when(userRepository.findByUserId("user-1")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> adminAccessService.requireAdmin())
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void adminUserPasses() {
        User user = new User();
        user.setUserId("admin-1");
        user.setUserRole("admin");
        when(projectAccessService.requireCurrentUserId()).thenReturn("admin-1");
        when(userRepository.findByUserId("admin-1")).thenReturn(Optional.of(user));

        adminAccessService.requireAdmin();
    }
}
