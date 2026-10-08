package org.myweb.flowmat.domain.inventory.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockFactsQuery;
import org.myweb.flowmat.domain.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockFactsQueryImpl implements StockFactsQuery {
    private final InventoryRepository stocks;
    private final ObjectMapper json;
    private final org.myweb.flowmat.domain.inventory.repository.LotMasterRepository lots;
    public Optional<Facts> findActiveStock(String id) { return stocks.findByInventoryIdAndDeletedYn(id,"N").map(this::facts); }
    public java.util.List<Facts> findStocks(java.util.Collection<String> ids) { return stocks.findAllById(ids).stream().map(this::facts).toList(); }
    public java.util.List<Facts> projectStocks(String id) { return stocks.findAllByProjectIdAndDeletedYnOrderByCreatedAtAsc(id,"N").stream().map(this::facts).toList(); }
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public java.util.List<Facts> lockItemStock(String projectId,String itemId) { return stocks.findAllById(stocks.lockItemStock(projectId,itemId)).stream().map(this::facts).toList(); }
    public java.util.List<Facts> lots(java.util.Collection<String> ids) { return lots.findAllById(ids).stream().map(this::facts).toList(); }
    private Facts facts(Object row) {
        try { return new Facts(json.writeValueAsString(row)); }
        catch(JsonProcessingException error) { throw new IllegalStateException("Cannot serialize internal stock facts.",error); }
    }
}
