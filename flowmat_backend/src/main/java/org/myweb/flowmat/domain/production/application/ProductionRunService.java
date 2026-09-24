package org.myweb.flowmat.domain.production.application;

import java.util.List;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunFinishRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunItemRecordRequest;
import org.myweb.flowmat.domain.production.api.dto.request.ProductionRunStartRequest;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunItemResponse;
import org.myweb.flowmat.domain.production.api.dto.response.ProductionRunResponse;

public interface ProductionRunService {

    List<ProductionRunResponse> listRuns(String workflowId);

    ProductionRunResponse startRun(ProductionRunStartRequest request);

    ProductionRunResponse getRun(String productionRunId);

    List<ProductionRunItemResponse> listRunItems(String productionRunId);

    ProductionRunItemResponse recordRunItem(String productionRunId, ProductionRunItemRecordRequest request);

    ProductionRunResponse finishRun(String productionRunId, ProductionRunFinishRequest request);

    /**
     * Cancels a recorded item of an open run: reverses its stock movement (re-checking today's stock), marks it
     * cancelled, and rebuilds the run's LOT genealogy without it. BOM plan lines are not recordings and cannot be
     * cancelled.
     */
    ProductionRunItemResponse cancelRunItem(String productionRunId, String productionRunItemId, String reason);
}
