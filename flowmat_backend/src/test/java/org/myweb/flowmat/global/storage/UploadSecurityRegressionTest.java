package org.myweb.flowmat.global.storage;

import static org.assertj.core.api.Assertions.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.myweb.flowmat.global.config.StorageProperties;
import org.springframework.mock.web.MockMultipartFile;

/** Hostile upload metadata must not bypass bounded reads or safe storage paths. */
class UploadSecurityRegressionTest {
    @TempDir Path root;

    @Test
    void anUnboundedStreamCannotBypassItsClaimedSize() {
        var properties = properties(4);
        var count = new AtomicInteger();
        var closed = new AtomicBoolean();
        var file = new MockMultipartFile("file", "guide.txt", "text/plain", new byte[] {65}) {
            @Override public InputStream getInputStream() {
                return new InputStream() {
                    @Override public int read() { count.incrementAndGet(); return 65; }
                    @Override public int read(byte[] bytes, int offset, int length) {
                        Arrays.fill(bytes, offset, offset + length, (byte) 65);
                        count.addAndGet(length);
                        return length;
                    }
                    @Override public void close() { closed.set(true); }
                };
            }
        };
        assertThatThrownBy(() -> UploadValidation.validate(file, properties)).isInstanceOf(IOException.class);
        assertThat(count.get()).isEqualTo(5);
        assertThat(closed.get()).isTrue();
    }

    @Test
    void aTruncatedStreamDoesNotCreateAFileWithFalseMetadata() {
        var closed = new AtomicBoolean();
        var file = new MockMultipartFile("file", "guide.txt", "text/plain", new byte[7]) {
            @Override public InputStream getInputStream() {
                return new ByteArrayInputStream(new byte[] {65, 66, 67}) {
                    @Override public void close() { closed.set(true); }
                };
            }
        };
        var service = new LocalStorageService(properties(8));
        assertThatThrownBy(() -> service.store(file, "instructions")).isInstanceOf(IOException.class);
        assertThat(closed.get()).isTrue();
        assertThat(root.toFile().list()).isEmpty();
    }

    @Test
    void theExactByteLimitAcceptsUtf8AndNormalizesMimeParameters() throws Exception {
        byte[] bytes = "가\n".getBytes(StandardCharsets.UTF_8);
        assertThat(bytes).hasSize(4);
        var file = new MockMultipartFile("file", "nested/안내.txt", "text/plain; charset=UTF-8", bytes);
        var validated = UploadValidation.validate(file, properties(4));
        assertThat(validated.bytes()).isEqualTo(bytes);
        assertThat(validated.contentType()).isEqualTo("text/plain");
        assertThat(validated.fileName()).isEqualTo("안내.txt");
    }

    @Test
    void filenameControlCharactersAreRejectedBeforeReadingContent() {
        for (String name : new String[] {"line\r\nX-Injected: value.txt", "null\0.txt", "tab\t.txt"}) {
            var opened = new AtomicBoolean();
            var file = new MockMultipartFile("file", name, "text/plain", new byte[] {65}) {
                @Override public InputStream getInputStream() { opened.set(true); return new ByteArrayInputStream(new byte[] {65}); }
            };
            assertThatThrownBy(() -> UploadValidation.validate(file, properties(4))).isInstanceOf(IOException.class);
            assertThat(opened.get()).isFalse();
        }
    }

    @Test
    void activeContentAndMissingMimeTypesAreRejectedEvenWithAnAllowedExtension() {
        for (String mime : new String[] {null, "", "text/html", "image/svg+xml"}) {
            var file = new MockMultipartFile("file", "guide.txt", mime, "<script>active</script>".getBytes(StandardCharsets.UTF_8));
            assertThatThrownBy(() -> UploadValidation.validate(file, properties(100))).isInstanceOf(IOException.class);
        }
    }

    @Test
    void windowsAndUnixAbsoluteOrEscapingDirectoriesCannotWriteFiles() throws Exception {
        var service = new LocalStorageService(properties(4));
        var file = new MockMultipartFile("file", "guide.txt", "text/plain", new byte[] {65});
        for (String path : new String[] {"../escape", "..\\escape", "/absolute", "C:\\absolute", "../x\\..\\escape"}) {
            assertThatThrownBy(() -> service.store(file, path)).isInstanceOf(IOException.class);
        }
        try (var files = Files.walk(root)) { assertThat(files.filter(Files::isRegularFile).count()).isZero(); }
    }

    private StorageProperties properties(long limit) {
        var properties = new StorageProperties();
        properties.setUploadDir(root.toString());
        properties.setMaxFileSizeBytes(limit);
        return properties;
    }
}
