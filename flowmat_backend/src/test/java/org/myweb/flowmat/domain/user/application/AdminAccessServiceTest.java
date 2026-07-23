package org.myweb.flowmat.domain.user.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.rbac.PermissionService;
import org.myweb.flowmat.global.rbac.SystemPermission;

@ExtendWith(MockitoExtension.class)
class AdminAccessServiceTest {

    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private AdminAccessService adminAccessService;

    @Test
    void requireAdminDelegatesToUserManagePermission() {
        adminAccessService.requireAdmin();
        verify(permissionService).require(SystemPermission.USER_MANAGE);
    }

    @Test
    void requireAdminPropagatesForbiddenFromPermissionService() {
        doThrow(new BusinessException(ErrorCode.FORBIDDEN)).when(permissionService).require(SystemPermission.USER_MANAGE);

        assertThatThrownBy(() -> adminAccessService.requireAdmin())
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(ErrorCode.FORBIDDEN);
    }
}
