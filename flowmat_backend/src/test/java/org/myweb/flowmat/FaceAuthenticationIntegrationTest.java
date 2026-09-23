package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Collections;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.user.application.FaceAuthService;
import org.myweb.flowmat.domain.user.repository.FaceDescriptorRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Autowired;

class FaceAuthenticationIntegrationTest extends IntegrationTestSupport {
    @Autowired FaceAuthService faceAuth;
    @Autowired FaceDescriptorRepository descriptors;

    @AfterEach
    void cleanUp() {
        faceAuth.deleteDescriptor(DEMO_OWNER);
    }

    @Test
    void failedLoginCommitsFailureCountsDespiteAuthenticationRollback() {
        faceAuth.registerDescriptor(DEMO_OWNER, vector("0"));
        for (int count = 1; count <= 5; count++) {
            assertThatThrownBy(() -> faceAuth.loginByFace(vector("1"), "test", "test", "127.0.0.1"))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.FACE_NOT_RECOGNIZED);
            assertThat(descriptors.findByUserId(DEMO_OWNER).orElseThrow().getFailCount()).isEqualTo(count);
        }
        assertThat(descriptors.findByUserId(DEMO_OWNER).orElseThrow().isLocked()).isTrue();
        assertThatThrownBy(() -> faceAuth.loginByFace(vector("0"), "test", "test", "127.0.0.1"))
            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.FACE_ACCOUNT_LOCKED);
    }

    @Test
    void failedMatchCommitsFailureCountDespiteAuthenticationRollback() {
        faceAuth.registerDescriptor(DEMO_OWNER, vector("0"));
        assertThatThrownBy(() -> faceAuth.matchFace(vector("1")))
            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.FACE_NOT_RECOGNIZED);
        assertThat(descriptors.findByUserId(DEMO_OWNER).orElseThrow().getFailCount()).isEqualTo(1);
    }

    private static String vector(String value) {
        return "[" + String.join(",", Collections.nCopies(128, value)) + "]";
    }
}
