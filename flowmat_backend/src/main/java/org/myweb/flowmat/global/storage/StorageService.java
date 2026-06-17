package org.myweb.flowmat.global.storage;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {

    String store(MultipartFile file, String directory) throws IOException;
}
