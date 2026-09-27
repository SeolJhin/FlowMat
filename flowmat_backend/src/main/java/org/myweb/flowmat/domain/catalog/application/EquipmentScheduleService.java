package org.myweb.flowmat.domain.catalog.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentCalendarRequest;
import org.myweb.flowmat.domain.catalog.api.dto.request.EquipmentDowntimeRequest;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentAvailabilityResponse;
import org.myweb.flowmat.domain.catalog.api.dto.response.EquipmentScheduleResponse;
import org.myweb.flowmat.domain.catalog.domain.entity.Equipment;
import org.myweb.flowmat.domain.catalog.domain.entity.EquipmentCalendar;
import org.myweb.flowmat.domain.catalog.domain.entity.EquipmentDowntime;
import org.myweb.flowmat.domain.catalog.repository.EquipmentCalendarRepository;
import org.myweb.flowmat.domain.catalog.repository.EquipmentDowntimeRepository;
import org.myweb.flowmat.domain.catalog.repository.EquipmentRepository;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Equipment calendars and downtime, and how much working time they leave in a window (docs/domain/equipment-schedule.md).
 * Shifts are local times in the planning time zone; downtime is stored as instants.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EquipmentScheduleService {

    /** The longest window availability is worked out for, and the longest downtime. */
    public static final Duration LONGEST_WINDOW = Duration.ofDays(366);
    private static final String NOT_DELETED = "N";
    private static final Set<String> DOWNTIME_TYPES = Set.of("maintenance", "breakdown", "other");
    private static final BigDecimal SECONDS_PER_HOUR = BigDecimal.valueOf(3600);

    private final EquipmentRepository equipmentRepository;
    private final EquipmentCalendarRepository calendarRepository;
    private final EquipmentDowntimeRepository downtimeRepository;
    private final ProjectAccessService projectAccessService;
    private final IdGenerator idGenerator;

    @Value("${app.planning.time-zone:Asia/Seoul}")
    private String timeZone;

    /** Working time in a window: hours with a calendar, hours down inside them, and what is left. */
    public record Availability(boolean calendarSet, BigDecimal workingHours, BigDecimal downtimeHours, BigDecimal availableHours) {
    }

    private record Span(Instant start, Instant end) {
        long seconds() {
            return Duration.between(start, end).getSeconds();
        }
    }

    public EquipmentScheduleResponse schedule(String equipmentId) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectReadAccess(equipment.getProjectId());
        return toResponse(equipment);
    }

    @Transactional
    public EquipmentScheduleResponse setCalendar(String equipmentId, EquipmentCalendarRequest request) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectWriteAccess(equipment.getProjectId());
        if (request == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "shiftStart, shiftEnd and workDays are required.");
        }
        LocalTime start = time(request.shiftStart(), "shiftStart");
        LocalTime end = time(request.shiftEnd(), "shiftEnd");
        if (request.workDays() == null || request.workDays().isEmpty()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Choose at least one work day.");
        }
        TreeSet<Integer> days = new TreeSet<>();
        for (Integer day : request.workDays()) {
            if (day == null || day < 1 || day > 7) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, "workDays are ISO days of the week, 1 (Monday) to 7 (Sunday).");
            }
            days.add(day);
        }
        EquipmentCalendar calendar = calendarRepository.findById(equipment.getEquipmentId()).orElseGet(EquipmentCalendar::new);
        calendar.setEquipmentId(equipment.getEquipmentId());
        calendar.setShiftStart(start);
        calendar.setShiftEnd(end);
        calendar.setWorkDays(days.stream().map(String::valueOf).collect(Collectors.joining(",")));
        calendar.setUpdatedBy(projectAccessService.requireCurrentUserId());
        calendar.setUpdatedAt(OffsetDateTime.now());
        calendarRepository.save(calendar);
        return toResponse(equipment);
    }

    /** Without a calendar the equipment is available around the clock again. */
    @Transactional
    public EquipmentScheduleResponse clearCalendar(String equipmentId) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectWriteAccess(equipment.getProjectId());
        calendarRepository.findById(equipment.getEquipmentId()).ifPresent(calendarRepository::delete);
        return toResponse(equipment);
    }

    @Transactional
    public EquipmentScheduleResponse addDowntime(String equipmentId, EquipmentDowntimeRequest request) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectWriteAccess(equipment.getProjectId());
        if (request == null) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "startsAt and endsAt are required.");
        }
        String type = request.downtimeType() == null || request.downtimeType().isBlank()
            ? "maintenance"
            : request.downtimeType().trim().toLowerCase(Locale.ROOT);
        if (!DOWNTIME_TYPES.contains(type)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "downtimeType is maintenance, breakdown or other.");
        }
        OffsetDateTime startsAt = dateTime(request.startsAt(), "startsAt");
        OffsetDateTime endsAt = dateTime(request.endsAt(), "endsAt");
        if (!endsAt.isAfter(startsAt)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "endsAt must be after startsAt.");
        }
        if (Duration.between(startsAt, endsAt).compareTo(LONGEST_WINDOW) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "A downtime can be at most 366 days long.");
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
        if (reason != null && reason.length() > 500) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "reason can be at most 500 characters.");
        }
        EquipmentDowntime downtime = new EquipmentDowntime();
        downtime.setDowntimeId(idGenerator.generate());
        downtime.setProjectId(equipment.getProjectId());
        downtime.setEquipmentId(equipment.getEquipmentId());
        downtime.setDowntimeType(type);
        downtime.setStartsAt(startsAt);
        downtime.setEndsAt(endsAt);
        downtime.setReason(reason);
        downtime.setCreatedBy(projectAccessService.requireCurrentUserId());
        downtimeRepository.save(downtime);
        return toResponse(equipment);
    }

    @Transactional
    public EquipmentScheduleResponse removeDowntime(String equipmentId, String downtimeId) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectWriteAccess(equipment.getProjectId());
        EquipmentDowntime downtime = downtimeRepository.findByDowntimeIdAndDeletedYn(downtimeId, NOT_DELETED)
            .filter(found -> equipment.getEquipmentId().equals(found.getEquipmentId()))
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        downtime.setDeletedYn("Y");
        downtime.setUpdatedBy(projectAccessService.requireCurrentUserId());
        downtimeRepository.save(downtime);
        return toResponse(equipment);
    }

    public EquipmentAvailabilityResponse availability(String equipmentId, String from, String to) {
        Equipment equipment = findEquipment(equipmentId);
        projectAccessService.requireProjectReadAccess(equipment.getProjectId());
        OffsetDateTime start = dateTime(from, "from");
        OffsetDateTime end = dateTime(to, "to");
        if (!end.isAfter(start)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "to must be after from.");
        }
        if (Duration.between(start, end).compareTo(LONGEST_WINDOW) > 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "The window can be at most 366 days long.");
        }
        Availability availability = window(equipment, start, end);
        BigDecimal rate = equipment.getCapacityPerHour();
        BigDecimal capacity = rate == null ? null : availability.availableHours().multiply(rate).stripTrailingZeros();
        return new EquipmentAvailabilityResponse(equipment.getEquipmentId(), start, end, availability.calendarSet(),
            availability.workingHours(), availability.downtimeHours(), availability.availableHours(), rate, capacity);
    }

    /**
     * Working time in [from, to) with no access check (callers check it): each shift that overlaps the window, clipped
     * to it, or the whole window without a calendar, less the merged downtime inside those shifts. The caller keeps the
     * window at most {@link #LONGEST_WINDOW} long.
     */
    public Availability window(Equipment equipment, OffsetDateTime from, OffsetDateTime to) {
        Instant start = from.toInstant();
        Instant end = to.toInstant();
        EquipmentCalendar calendar = calendarRepository.findById(equipment.getEquipmentId()).orElse(null);
        List<Span> working = calendar == null ? List.of(new Span(start, end)) : merge(shifts(calendar, start, end));
        List<Span> down = merge(downtimeRepository.findOverlapping(equipment.getEquipmentId(), from, to).stream()
            .map(downtime -> clip(downtime.getStartsAt().toInstant(), downtime.getEndsAt().toInstant(), start, end))
            .filter(span -> span != null)
            .toList());
        long workingSeconds = working.stream().mapToLong(Span::seconds).sum();
        long downSeconds = 0;
        for (Span shift : working) {
            for (Span downtime : down) {
                Span overlap = clip(downtime.start(), downtime.end(), shift.start(), shift.end());
                if (overlap != null) {
                    downSeconds += overlap.seconds();
                }
            }
        }
        return new Availability(calendar != null, hours(workingSeconds), hours(downSeconds), hours(workingSeconds - downSeconds));
    }

    /** Shifts that start on a work day, from the day before the window (a shift can run past midnight into it). */
    private List<Span> shifts(EquipmentCalendar calendar, Instant start, Instant end) {
        ZoneId zone = zone();
        Set<Integer> days = workDays(calendar);
        Duration length = shiftLength(calendar.getShiftStart(), calendar.getShiftEnd());
        List<Span> shifts = new ArrayList<>();
        LocalDate last = end.atZone(zone).toLocalDate();
        for (LocalDate day = start.atZone(zone).toLocalDate().minusDays(1); !day.isAfter(last); day = day.plusDays(1)) {
            if (!days.contains(day.getDayOfWeek().getValue())) {
                continue;
            }
            LocalDateTime shiftStart = day.atTime(calendar.getShiftStart());
            Span shift = clip(shiftStart.atZone(zone).toInstant(), shiftStart.plus(length).atZone(zone).toInstant(), start, end);
            if (shift != null) {
                shifts.add(shift);
            }
        }
        return shifts;
    }

    private EquipmentScheduleResponse toResponse(Equipment equipment) {
        EquipmentScheduleResponse.Calendar calendar = calendarRepository.findById(equipment.getEquipmentId())
            .map(found -> new EquipmentScheduleResponse.Calendar(found.getShiftStart().toString(), found.getShiftEnd().toString(),
                List.copyOf(workDays(found)), hours(shiftLength(found.getShiftStart(), found.getShiftEnd()).getSeconds()),
                found.getUpdatedBy(), found.getUpdatedAt()))
            .orElse(null);
        List<EquipmentScheduleResponse.Downtime> downtimes = downtimeRepository
            .findAllByEquipmentIdAndDeletedYnOrderByStartsAtDesc(equipment.getEquipmentId(), NOT_DELETED).stream()
            .map(downtime -> new EquipmentScheduleResponse.Downtime(downtime.getDowntimeId(), downtime.getDowntimeType(),
                downtime.getStartsAt(), downtime.getEndsAt(),
                hours(Duration.between(downtime.getStartsAt(), downtime.getEndsAt()).getSeconds()), downtime.getReason(),
                downtime.getCreatedBy(), downtime.getCreatedAt()))
            .toList();
        return new EquipmentScheduleResponse(equipment.getEquipmentId(), zone().getId(), calendar, downtimes);
    }

    private Equipment findEquipment(String equipmentId) {
        return equipmentRepository.findByEquipmentIdAndDeletedYn(equipmentId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private ZoneId zone() {
        return ZoneId.of(timeZone);
    }

    private static TreeSet<Integer> workDays(EquipmentCalendar calendar) {
        TreeSet<Integer> days = new TreeSet<>();
        for (String day : calendar.getWorkDays().split(",")) {
            days.add(Integer.parseInt(day.trim()));
        }
        return days;
    }

    /** A shift that ends at or before its start runs into the next day; equal times are a whole day. */
    private static Duration shiftLength(LocalTime start, LocalTime end) {
        Duration length = Duration.between(start, end);
        return length.isNegative() || length.isZero() ? length.plusHours(24) : length;
    }

    /** The part of [start, end) inside [from, to), or null when they do not overlap. */
    private static Span clip(Instant start, Instant end, Instant from, Instant to) {
        Instant clippedStart = start.isBefore(from) ? from : start;
        Instant clippedEnd = end.isAfter(to) ? to : end;
        return clippedEnd.isAfter(clippedStart) ? new Span(clippedStart, clippedEnd) : null;
    }

    private static List<Span> merge(List<Span> spans) {
        List<Span> sorted = spans.stream().sorted(Comparator.comparing(Span::start)).toList();
        List<Span> merged = new ArrayList<>();
        for (Span span : sorted) {
            Span last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            if (last != null && !span.start().isAfter(last.end())) {
                merged.set(merged.size() - 1, new Span(last.start(), span.end().isAfter(last.end()) ? span.end() : last.end()));
            } else {
                merged.add(span);
            }
        }
        return merged;
    }

    private static BigDecimal hours(long seconds) {
        return BigDecimal.valueOf(seconds).divide(SECONDS_PER_HOUR, 2, RoundingMode.HALF_UP);
    }

    private static LocalTime time(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, name + " is required.");
        }
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, name + " must be a time such as 08:30.");
        }
    }

    private static OffsetDateTime dateTime(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, name + " is required.");
        }
        try {
            return OffsetDateTime.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.BAD_REQUEST,
                name + " must be a date and time with an offset, such as 2030-01-07T09:00:00+09:00.");
        }
    }
}
