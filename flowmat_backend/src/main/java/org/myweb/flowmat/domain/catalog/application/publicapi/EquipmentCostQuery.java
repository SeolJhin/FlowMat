package org.myweb.flowmat.domain.catalog.application.publicapi;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;

/** Current planning rates, never actual execution costs. The caller checks project read access. */
public interface EquipmentCostQuery {
    /** Only live equipment in this project; unset rates are absent. Zero is a known rate. */
    Map<String, BigDecimal> findHourlyCosts(String projectId, Collection<String> equipmentIds);
}
