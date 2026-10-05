package org.myweb.flowmat.domain.bom.application.publicapi;

import java.time.LocalDate;
import java.util.Optional;

public interface BomRevisionQuery {
    /** Callers supply a day already resolved in the project's time zone. Overlapping legacy rows are a 409. */
    Optional<EffectiveBomView> findEffective(String projectId,String targetItemId,LocalDate on);
}
