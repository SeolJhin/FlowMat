package org.myweb.flowmat.domain.user.application;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserResponse me(String userId) {
        User user = userRepository.findByUserId(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "사용자 정보를 찾을 수 없습니다."));
        return new UserResponse(user.getId(), user.getUserId(), user.getUserName(), user.getUserEmail(), user.getUserStatus());
    }
}
