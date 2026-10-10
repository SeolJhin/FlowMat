package org.myweb.flowmat.global.exception;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.production.api.InstructionAttachmentController;
import org.myweb.flowmat.domain.production.application.InstructionAttachmentService;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
class MultipartExceptionHandlerTest {
 @Test void servletUploadLimitIsA413Error() throws Exception {
  var service=mock(InstructionAttachmentService.class);
  when(service.upload(any(),any(),any())).thenThrow(new MaxUploadSizeExceededException(10));
  var mvc=MockMvcBuilders.standaloneSetup(new InstructionAttachmentController(service)).setControllerAdvice(new MultipartExceptionHandler(),new GlobalExceptionHandler()).build();
  mvc.perform(multipart("/work-instructions/instruction/attachments/id").file(new MockMultipartFile("file","guide.txt","text/plain",new byte[]{65})).with(r->{r.setMethod("PUT");return r;})).andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.success").value(false));
 }
 @Test void missingPartUsesAValidationMessage() throws Exception {
  var mvc=MockMvcBuilders.standaloneSetup(new InstructionAttachmentController(mock(InstructionAttachmentService.class))).setControllerAdvice(new MultipartExceptionHandler(),new GlobalExceptionHandler()).build();
  mvc.perform(multipart("/work-instructions/instruction/attachments/id").with(r->{r.setMethod("PUT");return r;})).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("file is required."));
 }
}
