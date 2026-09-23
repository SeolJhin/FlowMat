package org.myweb.flowmat.global.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.config.StorageProperties;
import org.springframework.mock.web.MockMultipartFile;

class S3StorageServiceTest {

    private S3StorageService service;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        service = new S3StorageService(properties);
    }

    @Test
    void generatesSafeObjectKeyWithoutOriginalFilename() throws Exception {
        String key = service.store(file("nested/normal.png", "image/png"), "images");

        assertThat(key).matches("images/[0-9a-f-]+\\.png");
        assertThat(key).doesNotContain("nested", "..", "\\");
    }

    @Test
    void rejectsTraversalAndAbsoluteObjectPrefixes() {
        assertThatThrownBy(() -> service.store(file("safe.txt", "text/plain"), "../outside"))
            .isInstanceOfAny(java.io.IOException.class);
        assertThatThrownBy(() -> service.store(file("safe.txt", "text/plain"), "C:\\outside"))
            .isInstanceOfAny(java.io.IOException.class);
        assertThatThrownBy(() -> service.store(file("safe.txt", "text/plain"), "/etc"))
            .isInstanceOfAny(java.io.IOException.class);
    }

    private MockMultipartFile file(String filename, String contentType) {
        return new MockMultipartFile("file", filename, contentType, new byte[] {1});
    }
}
