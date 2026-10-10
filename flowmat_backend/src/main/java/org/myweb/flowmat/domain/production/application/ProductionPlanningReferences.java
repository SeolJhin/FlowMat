package org.myweb.flowmat.domain.production.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogUnitQuery;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockFactsQuery;
import org.myweb.flowmat.domain.bom.application.publicapi.BomPlanningQuery;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.springframework.stereotype.Component;
/** Local legacy adapters retain old planning data shapes; repositories and locks stay in their owning domains. */
@Component
@RequiredArgsConstructor
public class ProductionPlanningReferences {
    private final CatalogItemFactsQuery items;
    private final CatalogUnitQuery units;
    private final StockFactsQuery stocks;
    private final BomPlanningQuery boms;
    private final org.myweb.flowmat.domain.workflow.application.publicapi.WorkflowProductionQuery workflows;
    private final ObjectMapper mapper;
    public Optional<Item> item(String id) { return items.findActiveItem(id).map(f -> read(f.json(),Item.class)); }
    public List<Item> items(Collection<String> ids) { return items.findItems(ids).stream().map(f -> read(f.json(),Item.class)).toList(); }
    public Optional<String> unitCode(String id) { return units.code(id); }
    public List<Inventory> stocks(Collection<String> ids) { return stocks.findStocks(ids).stream().map(f -> read(f.json(),Inventory.class)).toList(); }
    public List<Inventory> projectStocks(String id) { return stocks.projectStocks(id).stream().map(f -> read(f.json(),Inventory.class)).toList(); }
    public List<Inventory> lockItemStock(String project,String item) { return stocks.lockItemStock(project,item).stream().map(f -> read(f.json(),Inventory.class)).toList(); }
    public List<LotMaster> lots(Collection<String> ids) { return stocks.lots(ids).stream().map(f -> read(f.json(),LotMaster.class)).toList(); }
    public Optional<BomHeader> bom(String id) { return boms.findActive(id).map(f -> read(f.json(),BomHeader.class)); }
    public Optional<org.myweb.flowmat.domain.workflow.domain.entity.Workflow> workflow(String id) {
        return workflows.findWorkflow(id).map(f -> read(f.json(),org.myweb.flowmat.domain.workflow.domain.entity.Workflow.class));
    }
    private <T> T read(String json,Class<T> type) {
        try { return mapper.readValue(json,type); }
        catch(JsonProcessingException error) { throw new IllegalStateException("Invalid internal planning facts.",error); }
    }
}
