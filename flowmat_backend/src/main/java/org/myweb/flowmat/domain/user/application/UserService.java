package org.myweb.flowmat.domain.user.application;

import java.util.List;
import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;

public interface UserService {

    UserResponse me(String userId);

    List<UserResponse> searchUsers(String query);
}