package org.myweb.flowmat.global.init;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.myweb.flowmat.domain.user.domain.entity.User;
import org.myweb.flowmat.domain.user.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataInitializer implements ApplicationRunner {

    private static final String DEMO_USER_ID  = "demo-owner";
    private static final String DEMO_PASSWORD = "demo1234";
    private static final String PLACEHOLDER   = "PLACEHOLDER_REPLACED_BY_INITIALIZER";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Optional<User> existing = userRepository.findByUserId(DEMO_USER_ID);
        if (existing.isEmpty()) {
            User user = new User();
            user.setId(UUID.randomUUID());
            user.setUserId(DEMO_USER_ID);
            user.setUserName("Demo Owner");
            user.setUserEmail("demo-owner@flowmat.local");
            user.setUserPwd(passwordEncoder.encode(DEMO_PASSWORD));
            user.setUserBirth(LocalDate.of(1990, 1, 1));
            user.setUserTel("000-0000-0000");
            user.setUserStatus("active");
            user.setDeleteYn("N");
            user.setEmailVerifiedYn("N");
            user.setFailedLoginCount(0);
            user.setPwdUpdatedAt(OffsetDateTime.now());
            userRepository.save(user);
            log.info("[DemoDataInitializer] demo-owner created (pw: {})", DEMO_PASSWORD);
            return;
        }
        User user = existing.get();
        if (PLACEHOLDER.equals(user.getUserPwd()) || !user.getUserPwd().startsWith("$2a$")) {
            user.setUserPwd(passwordEncoder.encode(DEMO_PASSWORD));
            userRepository.save(user);
            log.info("[DemoDataInitializer] demo-owner password initialized (pw: {})", DEMO_PASSWORD);
        }
    }
}
