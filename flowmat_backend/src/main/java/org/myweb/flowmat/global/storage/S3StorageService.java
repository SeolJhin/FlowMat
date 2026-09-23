package org.myweb.flowmat.global.storage;

import java.io.IOException;
import java.nio.file.Path;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.myweb.flowmat.global.config.StorageProperties;

@Service
public class S3StorageService implements StorageService {

    private final StorageProperties storageProperties;

    public S3StorageService(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @Override
    public String store(MultipartFile file, String directory) throws IOException {
        Path keyRoot = Path.of(".").toAbsolutePath().normalize();
        Path safeDirectory = StorageFilenamePolicy.resolveDirectory(keyRoot, directory);
        String filename = StorageFilenamePolicy.createStoredFilename(file, storageProperties);
        String prefix = keyRoot.relativize(safeDirectory).toString().replace('\\', '/');
        return prefix.isBlank() || ".".equals(prefix) ? filename : prefix + "/" + filename;
    }
}
