package org.myweb.flowmat.global.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Async
    public void sendProjectInvite(String toEmail, String projectName, String inviterName,
                                  String inviteToken, String role) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.debug("Mail not configured — skipping invite email to {}", toEmail);
            return;
        }
        try {
            String acceptUrl = frontendUrl + "/invite/accept?token=" + inviteToken;
            String subject = "[FlowMat] You've been invited to join " + projectName;
            String body = buildInviteHtml(projectName, inviterName, acceptUrl, role);
            send(toEmail, subject, body);
            log.debug("Invite email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send invite email to {}: {}", toEmail, e.getMessage());
        }
    }

    private void send(String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        mailSender.send(message);
    }

    private String buildInviteHtml(String projectName, String inviterName,
                                   String acceptUrl, String role) {
        return """
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">You have been invited to FlowMat</h2>
              <p><strong>%s</strong> has invited you to join the project <strong>%s</strong> as <strong>%s</strong>.</p>
              <a href="%s"
                 style="display:inline-block;margin-top:16px;padding:10px 20px;
                        background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">
                Accept Invitation
              </a>
              <p style="margin-top:24px;font-size:12px;color:#888">
                This link expires in 7 days. If you did not expect this invitation, you may ignore this email.
              </p>
            </div>
            """.formatted(inviterName, projectName, role, acceptUrl);
    }
}
