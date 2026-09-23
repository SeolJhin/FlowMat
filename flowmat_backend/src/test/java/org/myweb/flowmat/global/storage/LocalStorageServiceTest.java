package org.myweb.flowmat.global.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.myweb.flowmat.global.config.StorageProperties;
import org.springframework.mock.web.MockMultipartFile;

class LocalStorageServiceTest {

    @TempDir
    Path tempDir;

    private StorageProperties properties;
    private LocalStorageService service;

    @BeforeEach
    void setUp() {
        properties = new StorageProperties();
        properties.setUploadDir(tempDir.toString());
        service = new LocalStorageService(properties);
    }

    @AfterEach
    void cleanUp() throws Exception {
        try (var paths = Files.walk(tempDir)) {
            paths.filter(Files::isRegularFile).forEach(path -> path.toFile().delete());
        }
    }

    @Test
    void storesNormalImageWithServerGeneratedName() throws Exception {
        String stored = service.store(file("normal.png", "image/png", new byte[] {1, 2, 3}), "images");

        assertThat(stored).matches("images/[0-9a-f-]+\\.png");
        assertThat(Files.exists(tempDir.resolve(stored))).isTrue();
    }

    @Test
    void stripsPathComponentsFromOriginalFilename() throws Exception {
        for (String filename : new String[] {"../../outside.txt", "..\\..\\outside.txt", "/etc/passwd.txt",
            "C:\\temp\\a.txt", "foo/bar.txt", "foo\\bar.txt"}) {
            String stored = service.store(file(filename, "text/plain", new byte[] {1}), "text");
            assertThat(stored).startsWith("text/");
            assertThat(Path.of(stored).getNameCount()).isEqualTo(2);
        }
    }

    @Test
    void rejectsMissingExtension() {
        assertThatThrownBy(() -> service.store(file("no-extension", "text/plain", new byte[] {1}), "text"))
            .isInstanceOfAny(java.io.IOException.class);
    }

    @Test
    void rejectsUnsupportedExtension() {
        assertThatThrownBy(() -> service.store(file("script.exe", "application/octet-stream", new byte[] {1}), "files"))
            .isInstanceOfAny(java.io.IOException.class);
    }

    @Test
    void rejectsMismatchedMimeType() {
        assertThatThrownBy(() -> service.store(file("image.png", "text/plain", new byte[] {1}), "images"))
            .isInstanceOfAny(java.io.IOException.class);
    }

    @Test
    void rejectsOversizedFile() {
        properties.setMaxFileSizeBytes(2);

        assertThatThrownBy(() -> service.store(file("large.txt", "text/plain", new byte[] {1, 2, 3}), "files"))
            .isInstanceOfAny(java.io.IOException.class);
    }

    @Test
    void rejectsDirectoryTraversal() {
        assertThatThrownBy(() -> service.store(file("safe.txt", "text/plain", new byte[] {1}), "../outside"))
            .isInstanceOfAny(java.io.IOException.class);
        assertThat(Files.exists(tempDir.getParent().resolve("outside"))).isFalse();
    }

    private MockMultipartFile file(String filename, String contentType, byte[] content) {
        return new MockMultipartFile("file", filename, contentType, content);
    }
}
