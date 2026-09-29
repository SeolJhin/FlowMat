package org.myweb.flowmat;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.myweb.flowmat.domain.user.application.LoginRateLimitProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class LoginRateLimitPropertiesTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(TestConfiguration.class);

    @Test
    void defaultsKeepTheExistingAccountAndIpLimits() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            LoginRateLimitProperties properties = context.getBean(LoginRateLimitProperties.class);
            assertThat(properties.getAccountLimit()).isEqualTo(8);
            assertThat(properties.getIpLimit()).isEqualTo(12);
        });
    }

    @Test
    void theCiLimitsCanBeBoundWithoutChangingDefaults() {
        runner.withPropertyValues(
            "app.auth.login-rate-limit.account-limit=100",
            "app.auth.login-rate-limit.ip-limit=200"
        ).run(context -> {
            assertThat(context).hasNotFailed();
            LoginRateLimitProperties properties = context.getBean(LoginRateLimitProperties.class);
            assertThat(properties.getAccountLimit()).isEqualTo(100);
            assertThat(properties.getIpLimit()).isEqualTo(200);
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "app.auth.login-rate-limit.account-limit=0",
        "app.auth.login-rate-limit.account-limit=-1",
        "app.auth.login-rate-limit.ip-limit=0",
        "app.auth.login-rate-limit.ip-limit=-1"
    })
    void nonpositiveLimitsFailAtStartup(String property) {
        runner.withPropertyValues(property).run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(BindValidationException.class);
        });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(LoginRateLimitProperties.class)
    static class TestConfiguration {
    }
}
