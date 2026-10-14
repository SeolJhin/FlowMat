package org.myweb.flowmat.batch;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.myweb.flowmat.domain.notification.application.publicapi.NotificationCommand;
import org.myweb.flowmat.domain.notification.application.publicapi.NotificationSubscriptionQuery;
import org.myweb.flowmat.domain.notification.application.publicapi.NotificationSubscriptionView;
import org.myweb.flowmat.domain.production.application.publicapi.WorkOrderDueView;
import org.myweb.flowmat.domain.production.application.publicapi.WorkOrderQuery;
import org.myweb.flowmat.domain.project.application.publicapi.ProjectCalendarQuery;
import org.myweb.flowmat.domain.quality.application.publicapi.NcrCheckView;
import org.myweb.flowmat.domain.quality.application.publicapi.NonconformityQuery;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Reminders people chose (docs/domain/notification.md NS6-NS7): work orders due within their days and effectiveness
 * checks past their due day. Each reminder is sent once per person (its key) and in its own transaction, so one failing
 * stops no other. Read through the modules' public APIs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationReminderBatchService {

    private final NotificationSubscriptionQuery subscriptions;
    private final NotificationCommand notifications;
    private final WorkOrderQuery workOrders;
    private final NonconformityQuery nonconformities;
    private final ProjectCalendarQuery calendars;

    @Scheduled(
        fixedDelayString = "${app.notification.reminder-interval:PT1H}",
        initialDelayString = "${app.notification.reminder-interval:PT1H}"
    )
    public void sweep() {
        int sent = remind(OffsetDateTime.now(ZoneOffset.UTC));
        if (sent > 0) {
            log.info("Notification reminders sent: {}", sent);
        }
    }

    /** One pass at {@code now}; how many reminders were sent. */
    public int remind(OffsetDateTime now) {
        return remindWorkOrders(now) + remindChecks();
    }

    private int remindWorkOrders(OffsetDateTime now) {
        List<NotificationSubscriptionView> chosen = subscriptions.subscriptions(NotificationSubscriptionQuery.WORK_ORDER_DUE);
        if (chosen.isEmpty()) {
            return 0;
        }
        int furthest = chosen.stream().mapToInt(NotificationReminderBatchService::days).max().orElse(0);
        Set<String> projects = chosen.stream().map(NotificationSubscriptionView::projectId).collect(Collectors.toSet());
        Map<String, List<WorkOrderDueView>> due = workOrders.findDueBy(projects, now.plusDays(furthest)).stream()
            .collect(Collectors.groupingBy(WorkOrderDueView::projectId));
        int sent = 0;
        for (NotificationSubscriptionView subscription : chosen) {
            OffsetDateTime until = now.plusDays(days(subscription));
            for (WorkOrderDueView order : due.getOrDefault(subscription.projectId(), List.of())) {
                if (order.plannedEndAt().isAfter(until)) {
                    continue;
                }
                LocalDate day = calendars.date(order.projectId(), order.plannedEndAt().toInstant());
                String title = order.plannedEndAt().isBefore(now)
                    ? order.workOrderNumber() + " is past its planned end (" + day + ")"
                    : order.workOrderNumber() + " is due " + day;
                sent += send(subscription.userId(), order.projectId(), "work_order_due", title,
                    order.workOrderTitle() == null ? "" : order.workOrderTitle(), "work_order", order.workOrderId(),
                    "work_order_due:" + order.workOrderId() + ":" + order.plannedEndAt().toInstant());
            }
        }
        return sent;
    }

    private int remindChecks() {
        List<NotificationSubscriptionView> chosen = subscriptions.subscriptions(NotificationSubscriptionQuery.NCR_CHECK_OVERDUE);
        if (chosen.isEmpty()) {
            return 0;
        }
        Set<String> projects = chosen.stream().map(NotificationSubscriptionView::projectId).collect(Collectors.toSet());
        Map<String, List<NcrCheckView>> pending = nonconformities.findPendingChecks(projects).stream()
            .collect(Collectors.groupingBy(NcrCheckView::projectId));
        Map<String, LocalDate> today = new HashMap<>();
        int sent = 0;
        for (NotificationSubscriptionView subscription : chosen) {
            for (NcrCheckView check : pending.getOrDefault(subscription.projectId(), List.of())) {
                // Overdue the day after its due day, in the project's calendar (as the NCR list's overdue mark).
                LocalDate projectToday = today.computeIfAbsent(check.projectId(), calendars::today);
                if (!check.verificationDueDate().isBefore(projectToday)) {
                    continue;
                }
                sent += send(subscription.userId(), check.projectId(), "ncr_check_overdue",
                    "Effectiveness check of " + check.ncrNo() + " is overdue",
                    "Due " + check.verificationDueDate() + " · " + check.title(), "nonconformity", check.nonconformityId(),
                    "ncr_check_overdue:" + check.nonconformityId() + ":" + check.verificationDueDate());
            }
        }
        return sent;
    }

    private int send(String userId, String projectId, String type, String title, String body, String refType, String refId,
                     String key) {
        try {
            return notifications.tellOnce(userId, projectId, type, title, body, refType, refId, key) ? 1 : 0;
        } catch (RuntimeException failed) {
            log.warn("Notification reminder {} for {} failed", key, userId, failed);
            return 0;
        }
    }

    private static int days(NotificationSubscriptionView subscription) {
        return subscription.daysAhead() == null ? 0 : subscription.daysAhead();
    }
}
