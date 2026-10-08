package org.myweb.flowmat.domain.catalog.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogItemFactsQueryImpl implements CatalogItemFactsQuery {
    private final ItemRepository items;
    private final ObjectMapper json;
    public Optional<Facts> findActiveItem(String id) { return items.findByItemIdAndDeletedYn(id,"N").map(this::facts); }
    public java.util.List<Facts> findItems(java.util.Collection<String> ids) { return items.findAllById(ids).stream().map(this::facts).toList(); }
    public java.util.List<Facts> findProjectItems(String id) { return items.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(id,"N").stream().map(this::facts).toList(); }
    private Facts facts(Object row) {
        try { return new Facts(json.writeValueAsString(row)); }
        catch(JsonProcessingException error) { throw new IllegalStateException("Cannot serialize internal catalog facts.",error); }
    }
}
