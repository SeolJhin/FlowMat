package org.myweb.flowmat.domain.user.application;

import org.myweb.flowmat.domain.user.api.dto.request.UserLoginRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserSignupRequest;
import org.myweb.flowmat.domain.user.api.dto.response.UserTokenResponse;

public interface AuthService {

    void signup(UserSignupRequest request);

    UserTokenResponse login(UserLoginRequest request);
}