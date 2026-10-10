package org.myweb.flowmat.global.config;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.myweb.flowmat.global.storage.*;
class S3StorageConfigurationTest {
 ApplicationContextRunner runner(StorageProperties p,String type) {
  return new ApplicationContextRunner().withBean(StorageProperties.class,()->p)
   .withUserConfiguration(LocalStorageService.class,S3StorageService.class,S3StorageConfiguration.class)
   .withPropertyValues("app.storage.type="+type);
 }
 @Test void localIsTheOnlyDefaultBackend() {
  runner(new StorageProperties(),"local").run(c->{assertThat(c).hasSingleBean(StorageService.class);assertThat(c.getBean(StorageService.class).type()).isEqualTo("local");assertThat(c).doesNotHaveBean(S3StorageService.class);});
 }
 @Test void configuredS3UsesOnlyTheS3BackendWithoutOpeningANetworkConnection() {
  StorageProperties p=new StorageProperties();p.setS3Bucket("private-instructions");p.setS3Endpoint("http://127.0.0.1:19999");p.setS3PathStyle(true);
  runner(p,"s3").run(c->{assertThat(c).hasSingleBean(StorageService.class);assertThat(c.getBean(StorageService.class).type()).isEqualTo("s3");assertThat(c).doesNotHaveBean(LocalStorageService.class);});
 }
 @Test void missingBucketAndUnsafeEndpointsFailAtStartup() {
  runner(new StorageProperties(),"s3").run(c->assertThat(c).hasFailed());
  for(String endpoint:new String[]{"file:///tmp","https://embedded:credential@example.com"}) {
   StorageProperties p=new StorageProperties();p.setS3Bucket("private-instructions");p.setS3Endpoint(endpoint);
   runner(p,"s3").run(c->assertThat(c).hasFailed());
  }
 }
}
