package org.myweb.flowmat.domain.inventory.application.publicapi;
import java.util.Optional;
/** Complete immutable legacy rule facts. No entity or repository crosses the boundary; caller checks project access. */
public interface StockFactsQuery {
    record Facts(String json) { }
    Optional<Facts> findActiveStock(String id);
    java.util.List<Facts> findStocks(java.util.Collection<String> ids);
    java.util.List<Facts> projectStocks(String projectId);
    java.util.List<Facts> lockItemStock(String projectId,String itemId);
    java.util.List<Facts> lots(java.util.Collection<String> ids);
}
