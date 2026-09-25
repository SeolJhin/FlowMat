package org.myweb.flowmat.domain.quality.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectAccessService;
import org.myweb.flowmat.domain.quality.api.dto.response.QualitySummaryResponse;
import org.myweb.flowmat.domain.quality.api.dto.response.QualitySummaryResponse.CheckCount;
import org.myweb.flowmat.domain.quality.api.dto.response.QualitySummaryResponse.DefectTypeCount;
import org.myweb.flowmat.domain.quality.domain.entity.DefectLog;
import org.myweb.flowmat.domain.quality.domain.entity.QualityInspection;
import org.myweb.flowmat.domain.quality.repository.DefectLogRepository;
import org.myweb.flowmat.domain.quality.repository.QualityInspectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Counts over the project's inspections and defects (docs/domain/quality-inspection.md "요약"). Read only. Inspections
 * are placed in the window by when they were made, defects by when they were logged; {@code from} is inclusive and
 * {@code to} exclusive. Defect types and check names are grouped ignoring case, keeping the most recent spelling.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QualitySummaryService {

    private final QualityInspectionRepository inspectionRepository;
    private final DefectLogRepository defectLogRepository;
    private final ProjectAccessService projectAccessService;

    public QualitySummaryResponse summary(String projectId, OffsetDateTime from, OffsetDateTime to) {
        projectAccessService.requireProjectReadAccess(projectId);
        List<QualityInspection> inspections = inspectionRepository.findAllByProjectIdOrderByInspectedAtDesc(projectId).stream()
            .filter(inspection -> within(inspection.getInspectedAt(), from, to))
            .toList();
        List<DefectLog> defects = defectLogRepository.findAllByProjectIdOrderByLoggedAtDesc(projectId).stream()
            .filter(defect -> within(defect.getLoggedAt(), from, to))
            .toList();

        long failed = inspections.stream().filter(inspection -> QualityInspection.FAIL.equals(inspection.getResultStatus())).count();
        long passed = inspections.stream().filter(inspection -> QualityInspection.PASS.equals(inspection.getResultStatus())).count();
        BigDecimal passRate = inspections.isEmpty() ? null
            : BigDecimal.valueOf(passed).divide(BigDecimal.valueOf(inspections.size()), 4, RoundingMode.HALF_UP);

        Map<String, CheckCount> checks = new LinkedHashMap<>();
        for (QualityInspection inspection : inspections) {
            String key = key(inspection.getInspectionType());
            CheckCount before = checks.getOrDefault(key, new CheckCount(inspection.getInspectionType().trim(), 0, 0));
            checks.put(key, new CheckCount(before.inspectionType(), before.inspections() + 1,
                before.failed() + (QualityInspection.FAIL.equals(inspection.getResultStatus()) ? 1 : 0)));
        }
        Map<String, DefectTypeCount> types = new LinkedHashMap<>();
        for (DefectLog defect : defects) {
            String key = key(defect.getDefectType());
            DefectTypeCount before = types.getOrDefault(key, new DefectTypeCount(defect.getDefectType().trim(), 0, 0));
            types.put(key, new DefectTypeCount(before.defectType(), before.count() + 1, before.open() + (defect.isResolved() ? 0 : 1)));
        }
        long open = defects.stream().filter(defect -> !defect.isResolved()).count();

        return new QualitySummaryResponse(
            inspections.size(),
            passed,
            failed,
            passRate,
            open,
            defects.size() - open,
            types.values().stream()
                .sorted(Comparator.comparingLong(DefectTypeCount::count).reversed().thenComparing(DefectTypeCount::defectType))
                .toList(),
            checks.values().stream()
                .filter(check -> check.failed() > 0)
                .sorted(Comparator.comparingLong(CheckCount::failed).reversed().thenComparing(CheckCount::inspectionType))
                .toList()
        );
    }

    private static boolean within(OffsetDateTime at, OffsetDateTime from, OffsetDateTime to) {
        if (at == null) {
            return from == null && to == null;
        }
        return (from == null || !at.isBefore(from)) && (to == null || at.isBefore(to));
    }

    private static String key(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }
}
