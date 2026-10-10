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
        String stored = service.store(file("normal.png", "image/png", new byte[] {(byte)137,80,78,71,13,10,26,10}), "images");

        assertThat(stored).matches("images/[0-9a-f-]+\\.png");
        assertThat(Files.exists(tempDir.resolve(stored))).isTrue();
    }

    @Test
    void stripsPathComponentsFromOriginalFilename() throws Exception {
        for (String filename : new String[] {"../../outside.txt", "..\\..\\outside.txt", "/etc/passwd.txt",
            "C:\\temp\\a.txt", "foo/bar.txt", "foo\\bar.txt"}) {
            String stored = service.store(file(filename, "text/plain", new byte[] {65}), "text");
            assertThat(stored).startsWith("text/");
            assertThat(Path.of(stored).getNameCount()).isEqualTo(2);
        }
    }

    @Test
    void rejectsMissingExtension() {
        assertThatThrownBy(() -> service.store(file("no-extension", "text/plain", new byte[] {65}), "text"))
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

    @Test
    void readsAndDeletesOnlyFilesInsideStorage() throws Exception {
        String key=service.store(file("guard.txt","text/plain","Guard on".getBytes(java.nio.charset.StandardCharsets.UTF_8)),"instructions");
        try(var in=service.open(key)) { assertThat(in.readAllBytes()).isEqualTo("Guard on".getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
        assertThatThrownBy(()->service.open("../outside.txt")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(()->service.delete("../outside.txt")).isInstanceOf(java.io.IOException.class);
        service.delete(key); service.delete(key);
        assertThatThrownBy(()->service.open(key)).isInstanceOf(java.io.IOException.class);
    }
    @Test
    void rejectsSpoofedContentAndInvalidUtf8() {
        assertThatThrownBy(()->service.store(file("fake.png","image/png","<html>".getBytes()),"files")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(()->service.store(file("fake.pdf","application/pdf","plain text".getBytes()),"files")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(()->service.store(file("binary.txt","text/plain",new byte[]{0}),"files")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(()->service.store(file("broken.txt","text/plain",new byte[]{(byte)255}),"files")).isInstanceOf(java.io.IOException.class);
    }
    @Test
    void acceptsEachConfiguredSignatureAndTextFormat() throws Exception {
        Object[][] cases={
            {"guide.pdf","application/pdf","%PDF-1.7\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII)},
            {"photo.jpg","image/jpeg",new byte[]{(byte)255,(byte)216,(byte)255}},
            {"guide.gif","image/gif","GIF87a".getBytes(java.nio.charset.StandardCharsets.US_ASCII)},
            {"guide.gif","image/gif","GIF89a".getBytes(java.nio.charset.StandardCharsets.US_ASCII)},
            {"guide.webp","image/webp",new byte[]{82,73,70,70,0,0,0,0,87,69,66,80}},
            {"guide.csv","text/csv","item,qty\nGuard,1\n".getBytes(java.nio.charset.StandardCharsets.UTF_8)}
        };
        for(Object[] row:cases) {
            byte[] bytes=(byte[])row[2];String key=service.store(file((String)row[0],(String)row[1],bytes),"formats");
            try(var in=service.open(key)) {assertThat(in.readAllBytes()).isEqualTo(bytes);}
        }
    }
    private MockMultipartFile file(String filename, String contentType, byte[] content) {
        return new MockMultipartFile("file", filename, contentType, content);
    }
}
