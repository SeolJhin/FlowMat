package org.myweb.flowmat.domain.production.application;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.production.domain.entity.*;
import org.myweb.flowmat.domain.production.repository.*;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.config.StorageProperties;
import org.myweb.flowmat.global.exception.*;
import org.myweb.flowmat.global.storage.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
@ExtendWith(MockitoExtension.class)
class InstructionAttachmentServiceTest {
 @Mock InstructionAttachmentRepository attachments;
 @Mock WorkInstructionRepository instructions;
 @Mock ProjectAccessService access;
 @Mock StorageService storage;
 @Spy StorageProperties properties=new StorageProperties();
 @InjectMocks InstructionAttachmentService service;
 String id=UUID.randomUUID().toString();
 WorkInstruction wi;
 @BeforeEach void setup() { wi=new WorkInstruction();wi.setInstructionId("instruction");wi.setProjectId("project");wi.setStatus("draft");TransactionSynchronizationManager.initSynchronization(); }
 @AfterEach void cleanup() { TransactionSynchronizationManager.clearSynchronization(); }
 void writable() { when(instructions.findForUpdate("instruction")).thenReturn(Optional.of(wi));when(access.requireCurrentUserId()).thenReturn("owner"); }
 MockMultipartFile file() { return new MockMultipartFile("file","Guide.txt","text/plain","Guard".getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
 @Test void unavailableStorageDoesNotSaveMetadata() throws Exception {
  writable();when(storage.store(any(),any())).thenThrow(new IOException("private backend detail"));
  assertThatThrownBy(()->service.upload("instruction",id,file())).isInstanceOfSatisfying(BusinessException.class,e->{assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INTERNAL_ERROR);assertThat(e.getMessage()).doesNotContain("private backend detail");});
  verify(attachments,never()).saveAndFlush(any());
 }
 @Test void rollbackRemovesOnlyTheNewObject() throws Exception {
  writable();when(storage.store(any(),any())).thenReturn("instructions/new.txt");when(storage.type()).thenReturn("local");
  when(attachments.saveAndFlush(any())).thenThrow(new IllegalStateException("database rollback"));
  assertThatThrownBy(()->service.upload("instruction",id,file())).isInstanceOf(IllegalStateException.class);
  for(var sync:TransactionSynchronizationManager.getSynchronizations()) sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
  verify(storage).delete("instructions/new.txt");
 }
 @Test void successfulCommitRetainsTheObject() throws Exception {
  writable();when(storage.store(any(),any())).thenReturn("instructions/new.txt");when(storage.type()).thenReturn("local");
  when(attachments.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
  assertThat(service.upload("instruction",id,file()).sha256()).hasSize(64);
  for(var sync:TransactionSynchronizationManager.getSynchronizations()) sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
  verify(storage,never()).delete(any());
 }
 @Test void downloadRejectsCorruptContent() throws Exception {
  when(instructions.findByInstructionIdAndDeletedYn("instruction","N")).thenReturn(Optional.of(wi));
  InstructionAttachment a=new InstructionAttachment();a.setAttachmentId(id);a.setInstructionId("instruction");a.setStorageType("local");a.setStorageKey("original.txt");a.setSizeBytes(5L);a.setSha256("a".repeat(64));
  when(attachments.findById(id)).thenReturn(Optional.of(a));when(storage.type()).thenReturn("local");when(storage.open("original.txt")).thenReturn(new ByteArrayInputStream("wrong".getBytes()));
  assertThatThrownBy(()->service.download("instruction",id)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INTERNAL_ERROR));
 }
}
