package org.myweb.flowmat.domain.production.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.production.api.dto.request.RunStateSnapshotCreateRequest;
import org.myweb.flowmat.domain.production.api.dto.response.RunStateSnapshotResponse;
import org.myweb.flowmat.domain.production.domain.entity.ProductionRun;
import org.myweb.flowmat.domain.production.domain.entity.RunStateSnapshot;
import org.myweb.flowmat.domain.production.repository.ProductionRunRepository;
import org.myweb.flowmat.domain.production.repository.RunStateSnapshotRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.id.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RunStateSnapshotServiceImpl implements RunStateSnapshotService {

    private static final String NOT_DELETED = "N";

    private final RunStateSnapshotRepository runStateSnapshotRepository;
    private final ProductionRunRepository productionRunRepository;
    private final IdGenerator idGenerator;

    @Override
    public List<RunStateSnapshotResponse> listSnapshots(String productionRunId) {
        findActiveRun(productionRunId);
        return runStateSnapshotRepository.findAllByProductionRunIdOrderByCreatedAtDesc(productionRunId).stream()
            .map(RunStateSnapshotServiceImpl::toResponse)
            .toList();
    }

    @Override
    @Transactional
    public RunStateSnapshotResponse createSnapshot(RunStateSnapshotCreateRequest request) {
        ProductionRun run = findActiveRun(request.productionRunId());

        RunStateSnapshot snapshot = new RunStateSnapshot();
        snapshot.setRunStateSnapshotId(idGenerator.generate());
        snapshot.setProductionRunId(run.getProductionRunId());
        snapshot.setSnapshotName(trimToNull(request.snapshotName()));
        snapshot.setSnapshotType(defaultIfBlank(request.snapshotType(), "manual"));
        snapshot.setSnapshotData(request.snapshotData().trim());
        snapshot.setNote(trimToNull(request.note()));
        snapshot.setCreatedBy(trimToNull(request.createdBy()));
        return toResponse(runStateSnapshotRepository.save(snapshot));
    }

    @Override
    public RunStateSnapshotResponse getSnapshot(String runStateSnapshotId) {
        return toResponse(runStateSnapshotRepository.findByRunStateSnapshotId(runStateSnapshotId)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
    }

    private ProductionRun findActiveRun(String productionRunId) {
        return productionRunRepository.findByProductionRunIdAndDeletedYn(productionRunId, NOT_DELETED)
            .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static RunStateSnapshotResponse toResponse(RunStateSnapshot snapshot) {
        return new RunStateSnapshotResponse(
            snapshot.getRunStateSnapshotId(),
            snapshot.getProductionRunId(),
            snapshot.getSnapshotName(),
            snapshot.getSnapshotType(),
            snapshot.getSnapshotData(),
            snapshot.getNote(),
            snapshot.getCreatedBy(),
            snapshot.getCreatedAt()
        );
    }

    private static String trimToNull(String value) {
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return value != null && !value.isBlank() ? value.trim().toLowerCase() : defaultValue;
    }
}
