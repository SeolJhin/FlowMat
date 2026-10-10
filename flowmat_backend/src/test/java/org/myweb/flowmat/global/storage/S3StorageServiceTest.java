package org.myweb.flowmat.global.storage;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.myweb.flowmat.global.config.StorageProperties;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
class S3StorageServiceTest {
    S3Client client;
    S3StorageService service;
    @BeforeEach void setup() { client=mock(S3Client.class); StorageProperties p=new StorageProperties();p.setS3Bucket("private-instructions"); service=new S3StorageService(p,client); }
    @Test void uploadsActualBytesBeforeReturningSafeKey() throws Exception {
        String key=service.store(file("nested/guard.txt"),"instructions");
        assertThat(key).matches("instructions/[0-9a-f-]+\\.txt");
        var request=ArgumentCaptor.forClass(PutObjectRequest.class); var body=ArgumentCaptor.forClass(RequestBody.class);
        verify(client).putObject(request.capture(),body.capture());
        assertThat(request.getValue().bucket()).isEqualTo("private-instructions");
        assertThat(request.getValue().key()).isEqualTo(key);
        assertThat(request.getValue().contentType()).isEqualTo("text/plain");
        try(var in=body.getValue().contentStreamProvider().newStream()) { assertThat(in.readAllBytes()).isEqualTo("Guard".getBytes(StandardCharsets.UTF_8)); }
    }
    @Test void failedUploadsNeverReturnSuccess() {
        when(client.putObject(any(PutObjectRequest.class),any(RequestBody.class))).thenThrow(new IllegalStateException("unavailable"));
        assertThatThrownBy(()->service.store(file("guard.txt"),"instructions")).isInstanceOf(java.io.IOException.class);
    }
    @Test void downloadsAndDeletesExactObjectKey() throws Exception {
        when(client.getObject(any(GetObjectRequest.class))).thenReturn(new ResponseInputStream<>(GetObjectResponse.builder().build(),AbortableInputStream.create(new ByteArrayInputStream(new byte[]{65}))));
        try(var in=service.open("instructions/abc.txt")) { assertThat(in.read()).isEqualTo(65); }
        service.delete("instructions/abc.txt");
        verify(client).getObject(GetObjectRequest.builder().bucket("private-instructions").key("instructions/abc.txt").build());
        verify(client).deleteObject(DeleteObjectRequest.builder().bucket("private-instructions").key("instructions/abc.txt").build());
    }
    @Test void rejectsUnsafeObjectKeysBeforeContactingS3() {
        for(String prefix:new String[]{"../outside","C:\\outside","/etc"}) {
            assertThatThrownBy(()->service.store(file("guard.txt"),prefix)).isInstanceOf(java.io.IOException.class);
            assertThatThrownBy(()->service.open(prefix)).isInstanceOf(java.io.IOException.class);
            assertThatThrownBy(()->service.delete(prefix)).isInstanceOf(java.io.IOException.class);
        }
        verifyNoInteractions(client);
    }
    @Test void backendReadAndDeleteFailuresAreReported() {
        when(client.getObject(any(GetObjectRequest.class))).thenThrow(new IllegalStateException("private detail"));
        when(client.deleteObject(any(DeleteObjectRequest.class))).thenThrow(new IllegalStateException("private detail"));
        assertThatThrownBy(()->service.open("instructions/key.txt")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(()->service.delete("instructions/key.txt")).isInstanceOf(java.io.IOException.class);
    }
    MockMultipartFile file(String name) { return new MockMultipartFile("file",name,"text/plain","Guard".getBytes(StandardCharsets.UTF_8)); }
}
