package org.myweb.flowmat.domain.user.application;

import java.util.List;
import org.myweb.flowmat.domain.user.api.dto.request.SocialLinkUnlinkRequest;
import org.myweb.flowmat.domain.user.api.dto.request.UserUpdateRequest;
import org.myweb.flowmat.domain.user.api.dto.response.SocialAccountResponse;
import org.myweb.flowmat.domain.user.api.dto.response.UserResponse;

public interface UserService {

    UserResponse me(String userId);

    List<UserResponse> searchUsers(String query);

    List<SocialAccountResponse> mySocialAccounts(String userId);

    void unlinkSocialAccount(String userId, SocialLinkUnlinkRequest request);

    UserResponse updateMe(String userId, UserUpdateRequest request);

    void deleteMe(String userId);
}
