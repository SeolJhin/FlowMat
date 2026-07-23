package org.myweb.flowmat.domain.user.application;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.user.domain.entity.Role;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.domain.entity.UserRole;
import org.myweb.flowmat.domain.user.domain.enums.AdminUserActionType;
import org.myweb.flowmat.domain.user.repository.RoleRepository;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.domain.user.repository.UserRoleRepository;
import org.myweb.flowmat.global.rbac.PermissionService;
import org.myweb.flowmat.global.rbac.SystemPermission;

@ExtendWith(MockitoExtension.class)
class UserRoleServiceImplTest {

    @Mock
    private PermissionService permissionService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private AdminUserActionLogService adminUserActionLogService;

    @InjectMocks
    private UserRoleServiceImpl userRoleService;

    @Test
    void grantRoleWritesAuditLog() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUserId("tester");
        Role role = new Role();
        role.setRoleId(UUID.randomUUID());
        role.setRoleName("admin");

        when(userRepository.findByUserId("tester")).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleName("admin")).thenReturn(Optional.of(role));
        when(userRoleRepository.findByUserIdAndScopeType(user.getId(), "global")).thenReturn(List.of());
        when(userRoleRepository.save(org.mockito.ArgumentMatchers.any(UserRole.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        userRoleService.grantRole("tester", "admin");

        verify(permissionService).require(SystemPermission.USER_MANAGE);
        verify(adminUserActionLogService).record("tester", AdminUserActionType.ROLE_GRANT, null, "admin", null);
    }
}
