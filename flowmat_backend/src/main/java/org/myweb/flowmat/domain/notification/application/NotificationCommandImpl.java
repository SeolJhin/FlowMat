package org.myweb.flowmat.domain.notification.application;

import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.notification.application.publicapi.NotificationCommand;
import org.myweb.flowmat.domain.notification.domain.entity.Notification;
import org.myweb.flowmat.domain.notification.repository.NotificationRepository;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationCommandImpl implements NotificationCommand {

    private final NotificationRepository notificationRepository;
    private final IdGenerator idGenerator;

    @Override
    @Transactional
    public void notifyAssignee(String userId, String actorId, String projectId, String type, String title, String body, String refType,
                               String refId) {
        if (userId == null || userId.equals(actorId)) {
            return;
        }
        tell(userId, projectId, type, title, body, refType, refId);
    }

    @Override
    @Transactional
    public void tell(String userId, String projectId, String type, String title, String body, String refType, String refId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        Notification notification = new Notification();
        notification.setNfcId(idGenerator.generate());
        notification.setUserId(userId);
        notification.setProjectId(projectId);
        notification.setNfcType(type);
        notification.setNfcTitle(title.length() > 200 ? title.substring(0, 200) : title);
        notification.setNfcBody(body);
        notification.setRefType(refType);
        notification.setRefId(refId);
        notification.setRead(false);
        notification.setCreatedAt(OffsetDateTime.now());
        notificationRepository.save(notification);
    }
}
