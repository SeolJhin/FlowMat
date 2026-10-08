package org.myweb.flowmat.domain.catalog.application.publicapi;
import java.util.Optional;
/** Complete immutable legacy rule facts. No entity or repository crosses the boundary; caller checks project access. */
public interface CatalogItemFactsQuery {
    record Facts(String json) { }
    Optional<Facts> findActiveItem(String id);
    java.util.List<Facts> findItems(java.util.Collection<String> ids);
    java.util.List<Facts> findProjectItems(String projectId);
}
