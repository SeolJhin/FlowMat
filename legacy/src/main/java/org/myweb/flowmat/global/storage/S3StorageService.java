package org.myweb.flowmat.global.storage;

import java.io.IOException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class S3StorageService implements StorageService {

    @Override
    public String store(MultipartFile file, String directory) throws IOException {
        return directory + "/" + file.getOriginalFilename();
    }
}
