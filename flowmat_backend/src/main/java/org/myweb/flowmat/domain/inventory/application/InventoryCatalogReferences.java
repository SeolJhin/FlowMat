package org.myweb.flowmat.domain.inventory.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogUnitQuery;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.springframework.stereotype.Component;
/** Local legacy fact adapter; catalog owns its repositories and returns immutable snapshots. */
@Component
@RequiredArgsConstructor
public class InventoryCatalogReferences {
    private final CatalogItemFactsQuery items;
    private final CatalogUnitQuery units;
    private final ObjectMapper mapper;
    public Optional<Item> item(String id) { return items.findActiveItem(id).map(this::item); }
    public List<Item> items(Collection<String> ids) { return items.findItems(ids).stream().map(this::item).toList(); }
    public List<Item> projectItems(String id) { return items.findProjectItems(id).stream().map(this::item).toList(); }
    public Optional<String> unitCode(String id) { return units.code(id); }
    public Map<String,String> unitCodes(Collection<String> ids) { return units.codes(ids); }
    private Item item(CatalogItemFactsQuery.Facts facts) {
        try { return mapper.readValue(facts.json(),Item.class); }
        catch(JsonProcessingException error) { throw new IllegalStateException("Invalid internal catalog facts.",error); }
    }
}
