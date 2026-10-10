package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockFactsQuery;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.inventory.domain.entity.LotMaster;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Public Facts retain exact values and the caller's row-lock semantics; fixtures are disposable. */
class StockFactsRegressionIntegrationTest extends IntegrationTestSupport {
    @Autowired StockFactsQuery stocks;
    @Autowired CatalogItemFactsQuery items;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @Autowired EntityManagerFactory entities;

    @Test
    void aPreviouslyReadStockIsRefreshedAfterAnotherTransactionCommits() {
        String item=item(); String id=stock(item,"10");
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            assertEquals(new BigDecimal("10.0000"), inventory(stocks.findActiveStock(id).orElseThrow()).getQuantity());
            otherTransaction(() -> jdbc.update("update inventory set quantity=5,reserved_quantity=2,available_quantity=3,version=version+1 where inventory_id=?",id));
            Inventory locked=inventory(stocks.lockItemStock(DEMO_PROJECT,item).getFirst());
            assertEquals(new BigDecimal("5.0000"),locked.getQuantity());
            assertEquals(new BigDecimal("2.0000"),locked.getReservedQuantity());
            assertEquals(new BigDecimal("3.0000"),locked.getAvailableQuantity());
            assertEquals(1L,locked.getVersion());
        });
    }

    @Test
    void aCountStampWithoutAVersionBumpIsAlsoVisibleInTheLockedFacts() {
        String item=item();String id=stock(item,"10");
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            assertNull(inventory(stocks.findActiveStock(id).orElseThrow()).getLastCheckedAt());
            otherTransaction(() -> jdbc.update("update inventory set last_checked_at='2030-02-01T01:02:03.123456Z',last_checked_by=? where inventory_id=?",DEMO_OWNER,id));
            Inventory locked=inventory(stocks.lockItemStock(DEMO_PROJECT,item).getFirst());
            assertNotNull(locked.getLastCheckedAt());
            assertEquals(Instant.parse("2030-02-01T01:02:03.123456Z"),locked.getLastCheckedAt().toInstant());
            assertEquals(DEMO_OWNER,locked.getLastCheckedBy());
            assertEquals(0L,locked.getVersion());
        });
    }

    @Test
    @Timeout(45)
    void theLockStaysHeldUntilTheCallersTransactionCommits() throws Exception {
        String item=item();String id=stock(item,"10");var pool=Executors.newSingleThreadExecutor();
        try {
            var waiting=new TransactionTemplate(transactions).execute(tx -> {
                stocks.lockItemStock(DEMO_PROJECT,item);
                int blocker=jdbc.queryForObject("select pg_backend_pid()",Integer.class);
                var writer=pool.submit(() -> jdbc.update("update inventory set quantity=9,available_quantity=9,version=version+1 where inventory_id=?",id));
                DatabaseContention.awaitWaitingOrDone(jdbc,writer,blocker);
                assertFalse(writer.isDone(),"A competing stock write must wait for the caller to commit.");
                return writer;
            });
            assertNotNull(waiting);assertEquals(1,waiting.get(10,TimeUnit.SECONDS));
            assertEquals(new BigDecimal("9.0000"),inventory(stocks.findActiveStock(id).orElseThrow()).getQuantity());
        } finally {pool.shutdownNow();}
    }

    @Test
    void lockingWithoutACallerTransactionIsRejected() {
        assertThrows(IllegalTransactionStateException.class,() -> stocks.lockItemStock(DEMO_PROJECT,UUID.randomUUID().toString()));
    }

    @Test
    void decimalsMicrosecondInstantsCalendarDatesAndNullableFieldsRoundTrip() throws Exception {
        String item=item();String id=stock(item,"9999999999.9999");
        jdbc.update("update item set unit_cost=9999999999.9999,conversion_rate=1.12345678,barcode=null where item_id=?",item);
        jdbc.update("update inventory set last_checked_at='2030-02-01T10:02:03.123456+09:00',last_checked_by=?,created_at='2030-02-01T01:02:03.123456Z' where inventory_id=?",DEMO_OWNER,id);
        Item read=json.readValue(items.findActiveItem(item).orElseThrow().json(),Item.class);
        assertEquals(new BigDecimal("9999999999.9999"),read.getUnitCost());
        assertEquals(new BigDecimal("1.12345678"),read.getConversionRate());assertNull(read.getBarcode());
        Inventory row=inventory(stocks.findActiveStock(id).orElseThrow());
        assertEquals(new BigDecimal("9999999999.9999"),row.getQuantity());
        assertEquals(Instant.parse("2030-02-01T01:02:03.123456Z"),row.getLastCheckedAt().toInstant());
        assertEquals(row.getCreatedAt().toInstant(),row.getLastCheckedAt().toInstant());assertNull(row.getLotId());
        String lot=UUID.randomUUID().toString();
        jdbc.update("insert into lot_master(lot_id,project_id,item_id,lot_no,expiry_date,received_at) values(?,?,?,?,'2032-02-29','2030-02-01T01:02:03.123456Z')",lot,DEMO_PROJECT,item,"FACT-"+lot.substring(0,8));
        LotMaster batch=json.readValue(stocks.lots(List.of(lot)).getFirst().json(),LotMaster.class);
        assertEquals(LocalDate.of(2032,2,29),batch.getExpiryDate());assertNull(batch.getProducedAt());
        assertEquals(row.getCreatedAt().toInstant(),batch.getReceivedAt().toInstant());
        assertTrue(stocks.findActiveStock("missing").isEmpty());assertTrue(items.findActiveItem("missing").isEmpty());
        assertTrue(stocks.findStocks(List.of()).isEmpty());assertTrue(stocks.lots(List.of()).isEmpty());
    }

    @Test
    void freshLockedStocksUseTwoQueriesRegardlessOfBatchSize() {
        String item=item();for(int i=0;i<12;i++)stock(item,"10");
        Statistics stats=entities.unwrap(SessionFactory.class).getStatistics();boolean enabled=stats.isStatisticsEnabled();
        stats.setStatisticsEnabled(true);
        try {
            new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                stats.clear();var locked=stocks.lockItemStock(DEMO_PROJECT,item);
                assertEquals(12,locked.size());locked.forEach(f -> assertEquals(new BigDecimal("10.0000"),inventory(f).getQuantity()));
                assertTrue(stats.getPrepareStatementCount()<=2,"Fresh locked facts must stay a bulk read: "+stats.getPrepareStatementCount());
            });
        } finally {stats.setStatisticsEnabled(enabled);}
    }

    @Test
    void itemAndStockBatchesUseOneQueryEachAndAReadSnapshotCannotChange() {
        var itemIds=new ArrayList<String>();var stockIds=new ArrayList<String>();
        for(int i=0;i<12;i++){String item=item();itemIds.add(item);stockIds.add(stock(item,"10"));}
        String frozen=stocks.findActiveStock(stockIds.getFirst()).orElseThrow().json();
        jdbc.update("update inventory set quantity=9,available_quantity=9,version=version+1 where inventory_id=?",stockIds.getFirst());
        assertEquals(new BigDecimal("10.0000"),inventory(new StockFactsQuery.Facts(frozen)).getQuantity());
        Statistics stats=entities.unwrap(SessionFactory.class).getStatistics();boolean enabled=stats.isStatisticsEnabled();stats.setStatisticsEnabled(true);
        try {
            stats.clear();assertEquals(12,items.findItems(itemIds).size());assertEquals(12,stocks.findStocks(stockIds).size());
            assertTrue(stats.getPrepareStatementCount()<=2,"Bulk item/stock facts must not become N+1: "+stats.getPrepareStatementCount());
        } finally {stats.setStatisticsEnabled(enabled);}
    }

    private Inventory inventory(StockFactsQuery.Facts facts) {
        try {return json.readValue(facts.json(),Inventory.class);}catch(Exception error){throw new AssertionError(error);}
    }
    private void otherTransaction(Runnable command) {
        var other=new TransactionTemplate(transactions);other.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);other.executeWithoutResult(tx -> command.run());
    }
    private String item(){String id=UUID.randomUUID().toString();jdbc.update("insert into item(item_id,project_id,item_code,item_name,unit_id) values(?,?,?,?,?)",id,DEMO_PROJECT,"FACT-"+id.substring(0,8),"Facts regression","unit_ea");return id;}
    private String stock(String item,String quantity){String id=UUID.randomUUID().toString();jdbc.update("insert into inventory(inventory_id,project_id,item_id,quantity,reserved_quantity,available_quantity,inventory_status,location) values(?,?,?,cast(? as numeric),0,cast(? as numeric),'available',?)",id,DEMO_PROJECT,item,quantity,quantity,"FACT-"+id.substring(0,8));return id;}
}
