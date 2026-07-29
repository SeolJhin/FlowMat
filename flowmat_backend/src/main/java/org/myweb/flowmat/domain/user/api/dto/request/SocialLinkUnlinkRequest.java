package org.myweb.flowmat.domain.user.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SocialLinkUnlinkRequest(
    @NotBlank String provider,
    @NotBlank String currentPassword
) {
}
