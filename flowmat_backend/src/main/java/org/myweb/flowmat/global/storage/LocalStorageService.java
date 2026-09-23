package org.myweb.flowmat.global.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
        Path uploadRoot = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        Path dir = StorageFilenamePolicy.resolveDirectory(uploadRoot, directory);
        Files.createDirectories(dir);
        String name = StorageFilenamePolicy.createStoredFilename(file, storageProperties);
        Path target = dir.resolve(name).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new IOException("Upload target escapes the configured upload root.");
        }
        file.transferTo(target);
        return uploadRoot.relativize(target).toString().replace('\\', '/');
    }
}
