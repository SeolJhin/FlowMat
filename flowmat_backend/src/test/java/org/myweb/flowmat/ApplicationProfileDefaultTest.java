package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.ClassPathResource;

/**
 * The base configuration names no profile: an install that forgets one must not fall back to dev, whose Flyway setting
 * keeps the demo account and its known password (V18 removes the demo rows only outside demo environments).
 */
class ApplicationProfileDefaultTest {

    @Test
    void theBaseConfigurationDoesNotPickAProfile() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();
        assertFalse(properties.containsKey("spring.profiles.default"), "spring.profiles.default must not be set");
        assertFalse(properties.containsKey("spring.profiles.active"), "spring.profiles.active must not be set");
    }
}
