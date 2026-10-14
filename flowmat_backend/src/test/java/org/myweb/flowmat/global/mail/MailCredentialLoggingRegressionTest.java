package org.myweb.flowmat.global.mail;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

/** Fake credentials must reach mail content, never diagnostic messages. No external mail is sent. */
class MailCredentialLoggingRegressionTest {
    private static final String MARKER = "PRIVATE_MAIL_CREDENTIAL_MARKER";
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final MailService service = new MailService(sender);
    private final Logger logger = (Logger) LoggerFactory.getLogger(MailService.class);
    private final ListAppender<ILoggingEvent> events = new ListAppender<>();
    private boolean previousAdditive;

    @BeforeEach
    void captureOnlyMailDiagnostics() {
        previousAdditive = logger.isAdditive();
        logger.setAdditive(false);
        events.start();
        logger.addAppender(events);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://flowmat.example.invalid");
    }

    @AfterEach
    void restoreLogger() {
        logger.detachAppender(events);
        events.stop();
        logger.setAdditive(previousAdditive);
    }

    @ParameterizedTest
    @EnumSource(MailKind.class)
    void missingConfigurationDoesNotLogCredentials(MailKind kind) {
        ReflectionTestUtils.setField(service, "fromAddress", "");
        kind.send(service);
        assertNoCredentialInDiagnostics();
        verifyNoInteractions(sender);
    }

    @ParameterizedTest
    @EnumSource(MailKind.class)
    void failedDeliveryDoesNotLogCredentialsEchoedBySender(MailKind kind) {
        configureSender();
        doThrow(new MailSendException("Rejected message: " + MARKER)).when(sender).send(any(MimeMessage.class));
        kind.send(service);
        assertNoCredentialInDiagnostics();
        assertTrue(events.list.stream().anyMatch(event -> event.getLevel().toString().equals("WARN")));
    }

    @ParameterizedTest
    @EnumSource(MailKind.class)
    void successfulDeliveryKeepsCredentialInHtmlOnly(MailKind kind) throws Exception {
        MimeMessage message = configureSender();
        kind.send(service);
        verify(sender).send(message);
        assertTrue(message.getContent().toString().contains(kind.expectedContent()), "Mail credential/link changed");
        assertNoCredentialInDiagnostics();
    }

    private MimeMessage configureSender() {
        ReflectionTestUtils.setField(service, "fromAddress", "sender@example.invalid");
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        return message;
    }

    private void assertNoCredentialInDiagnostics() {
        for (ILoggingEvent event : events.list) {
            assertFalse(event.getFormattedMessage().contains(MARKER), "Mail credential appeared in diagnostics");
            assertTrue(event.getThrowableProxy() == null, "Sender exception attached to diagnostics");
        }
    }

    private enum MailKind {
        VERIFICATION, RESET, REACTIVATION, INVITE;

        void send(MailService service) {
            switch (this) {
                case VERIFICATION -> service.sendEmailVerificationCode("recipient@example.invalid", MARKER);
                case RESET -> service.sendPasswordResetMail("recipient@example.invalid", MARKER);
                case REACTIVATION -> service.sendDormantReactivationMail("recipient@example.invalid", MARKER);
                case INVITE -> service.sendProjectInvite("recipient@example.invalid", "Project", "Owner", MARKER, "viewer");
            }
        }

        String expectedContent() {
            return switch (this) {
                case VERIFICATION -> MARKER;
                case RESET -> "https://flowmat.example.invalid/reset-password?token=" + MARKER;
                case REACTIVATION -> "https://flowmat.example.invalid/reactivate-account?token=" + MARKER;
                case INVITE -> "https://flowmat.example.invalid/invite/accept?token=" + MARKER;
            };
        }
    }
}
