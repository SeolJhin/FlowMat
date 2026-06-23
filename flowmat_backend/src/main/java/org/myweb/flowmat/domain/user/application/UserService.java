package org.myweb.flowmat.domain.user.application;

import java.util.UUID;
import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;

public interface UserService {

    UserResponse me(UUID userId);
}