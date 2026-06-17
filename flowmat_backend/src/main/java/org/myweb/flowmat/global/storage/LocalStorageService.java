package org.myweb.flowmat.global.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.myweb.flowmat.global.config.StorageProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalStorageService implements StorageService {

    private final StorageProperties storageProperties;

    public LocalStorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @Override
    public String store(MultipartFile file, String directory) throws IOException {
        Path dir = Paths.get(storageProperties.getUploadDir(), directory);
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = dir.resolve(name);
        file.transferTo(target);
        return target.toString();
    }
}
