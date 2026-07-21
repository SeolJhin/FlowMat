package org.myweb.flowmat.domain.user.application;

import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;

public interface UserService {

    UserResponse me(String userId);
}