package org.myweb.flowmat.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ProductionConfigValidatorTest {

    private static final String STRONG_SECRET = "3f9a1c7e5b2d8f40a6c1e9b7d3f5a2c8e0b4d6f1a3c5e7b9";

    @Test
    void acceptsCompleteProductionConfiguration() {
        ProductionConfigValidator validator = new ProductionConfigValidator(
            "https://app.flowmat.io",
            "https://app.flowmat.io/oauth/callback",
            "https://app.flowmat.io, https://admin.flowmat.io",
            STRONG_SECRET,
            "smtp.flowmat.io"
        );

        assertThat(validator.validate()).isEmpty();
    }

    @Test
    void reportsEveryProblemAtOnce() {
        ProductionConfigValidator validator = new ProductionConfigValidator(
            "",
            "not a url",
            "*",
            "flowmat-local-dev-secret-key-32bytes!!",
            " "
        );

        assertThat(validator.validate())
            .hasSize(5)
            .anySatisfy(problem -> assertThat(problem).startsWith("app.frontend-url"))
            .anySatisfy(problem -> assertThat(problem).contains("redirect-uri"))
            .anySatisfy(problem -> assertThat(problem).contains("explicit origins"))
            .anySatisfy(problem -> assertThat(problem).contains("development placeholder"))
            .anySatisfy(problem -> assertThat(problem).contains("MAIL_HOST"));
    }

    @Test
    void optionalRedirectMayBeBlankButRelativeUrlsAreRejected() {
        ProductionConfigValidator validator = new ProductionConfigValidator(
            "/app",
            "",
            "https://app.flowmat.io",
            STRONG_SECRET,
            "smtp.flowmat.io"
        );

        assertThat(validator.validate()).containsExactly("app.frontend-url (FRONTEND_URL) must be an absolute http(s) URL, got '/app'.");
    }

    @Test
    void startupFailsWithAllProblemsListed() {
        ProductionConfigValidator validator = new ProductionConfigValidator("", "", "", STRONG_SECRET, "smtp.flowmat.io");

        assertThatThrownBy(validator::afterPropertiesSet)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("FRONTEND_URL")
            .hasMessageContaining("APP_CORS_ALLOWED_ORIGINS");
    }
}
