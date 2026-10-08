package org.myweb.flowmat.domain.bom.application.publicapi;
import java.util.Optional;
public interface BomPlanningQuery {
    record Facts(String json) { }
    Optional<Facts> findActive(String id);
}
