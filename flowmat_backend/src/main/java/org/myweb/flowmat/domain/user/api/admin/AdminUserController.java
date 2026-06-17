package org.myweb.flowmat.domain.user.api.admin;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.application.UserRoleService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/users")
public class AdminUserController {

    private final UserRoleService userRoleService;
}
