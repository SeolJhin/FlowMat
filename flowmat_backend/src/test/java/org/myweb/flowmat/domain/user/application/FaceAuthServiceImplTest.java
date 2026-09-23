package org.myweb.flowmat.domain.user.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.myweb.flowmat.domain.user.repository.FaceDescriptorRepository;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.security.JwtProvider;

class FaceAuthServiceImplTest {
    private final FaceDescriptorRepository descriptors = Mockito.mock(FaceDescriptorRepository.class);
    private final UserRepository users = Mockito.mock(UserRepository.class);
    private final JwtProvider jwt = Mockito.mock(JwtProvider.class);
    private final AuthRedisStore redis = Mockito.mock(AuthRedisStore.class);
    private FaceAuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FaceAuthServiceImpl(descriptors, users, jwt, new ObjectMapper(), redis, Mockito.mock(FaceFailureService.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"NaN\"", "\"Infinity\"", "null", "true", "1e309"})
    void allFaceEntryPointsRejectNonFiniteOrNonNumericElementsBeforeLookingUpAccounts(String element) {
        String descriptor = "[" + String.join(",", Collections.nCopies(128, element)) + "]";
        assertThatThrownBy(() -> service.registerDescriptor("user", descriptor))
            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.BAD_REQUEST);
        assertThatThrownBy(() -> service.matchFace(descriptor))
            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.BAD_REQUEST);
        assertThatThrownBy(() -> service.loginByFace(descriptor, "device", "agent", "ip"))
            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(ErrorCode.BAD_REQUEST);
        verifyNoInteractions(descriptors, users, jwt, redis);
    }
}
