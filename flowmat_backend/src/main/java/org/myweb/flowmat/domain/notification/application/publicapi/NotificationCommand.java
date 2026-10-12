package org.myweb.flowmat.domain.notification.application.publicapi;

/**
 * Tells people in the app about work given to them (docs/domain/notification.md NT2), for other bounded contexts, which
 * use this instead of the notification repositories (docs/architecture/adr/ADR-002-module-dependency.md).
 */
public interface NotificationCommand {

    /**
     * Tells {@code userId} about work given to them, in the caller's transaction, so a change that is refused tells no one.
     * Nobody is told when there is no one, or when the person gave the work to themselves ({@code actorId}).
     *
     * @param type    what happened, such as ncr_action or warehouse_task
     * @param refType what to open, such as nonconformity or warehouse_task, with {@code refId}
     */
    void notifyAssignee(String userId, String actorId, String projectId, String type, String title, String body, String refType,
                        String refId);

    /**
     * Tells {@code userId} about something in a project they look after, such as a stock alert that opened (NT7), in the
     * caller's transaction. Unlike {@link #notifyAssignee} it tells them even when they caused it.
     */
    void tell(String userId, String projectId, String type, String title, String body, String refType, String refId);
}
