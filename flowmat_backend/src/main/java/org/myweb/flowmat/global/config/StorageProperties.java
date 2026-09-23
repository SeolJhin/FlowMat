package org.myweb.flowmat.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    private String type = "local";
    private String uploadDir = "./uploads";
    private long maxFileSizeBytes = 10 * 1024 * 1024;
    private String allowedExtensions = "png,jpg,jpeg,gif,webp,pdf,txt,csv";
    private String allowedMimeTypes =
        "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv";
}
