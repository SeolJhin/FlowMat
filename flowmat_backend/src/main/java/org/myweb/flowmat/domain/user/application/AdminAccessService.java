package org.myweb.flowmat.domain.user.application;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAccessService {

    private final ProjectAccessService projectAccessService;
    private final UserRepository userRepository;

    public void requireAdmin() {
        String userId = projectAccessService.requireCurrentUserId();
        User user = userRepository.findByUserId(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Authenticated user was not found."));
        String role = user.getUserRole();
        if (role == null || !"admin".equalsIgnoreCase(role.trim())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Admin access is required.");
        }
    }
}
