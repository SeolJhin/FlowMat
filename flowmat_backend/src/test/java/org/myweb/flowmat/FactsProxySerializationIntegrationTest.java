package org.myweb.flowmat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockFactsQuery;
import org.myweb.flowmat.domain.inventory.domain.entity.Inventory;
import org.myweb.flowmat.domain.workflow.application.publicapi.WorkflowProductionQuery;
import org.myweb.flowmat.domain.workflow.domain.entity.Process;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.domain.workflow.domain.entity.Workflow;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Internal Facts must serialize the same data when the caller already holds an entity proxy. */
class FactsProxySerializationIntegrationTest extends IntegrationTestSupport {
    @Autowired private CatalogItemFactsQuery items;
    @Autowired private StockFactsQuery stocks;
    @Autowired private WorkflowProductionQuery workflows;
    @Autowired private EntityManager entities;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactions;

    @ParameterizedTest
    @EnumSource(Kind.class)
    void anExistingUninitializedReferenceDoesNotBreakFactsSerialization(Kind kind) {
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            entities.clear();
            Object reference = entities.getReference(kind.type, kind.id);
            assertFalse(Hibernate.isInitialized(reference), "The fixture must start as a real lazy proxy");
            String serialized = switch (kind) {
                case ITEM -> items.findActiveItem(kind.id).orElseThrow().json();
                case ITEM_BATCH -> items.findItems(List.of(kind.id)).getFirst().json();
                case WORKFLOW -> workflows.findWorkflow(kind.id).orElseThrow().json();
                case WORKFLOW_LOCK -> workflows.lockWorkflow(kind.id).json();
                case PROCESS -> workflows.findProcess(kind.id).orElseThrow().json();
                case PORT -> workflows.findProcessIo(kind.id).orElseThrow().json();
            };
            JsonNode tree = read(serialized);
            assertNotNull(tree.get(kind.idField));
            org.junit.jupiter.api.Assertions.assertEquals(kind.id, tree.path(kind.idField).asText());
            assertFalse(tree.has("hibernateLazyInitializer"), "An internal Facts payload must not contain ORM internals");
        });
    }

    @Test
    void stockFactsKeepTheExistingProxySafeSerializationBehavior() {
        String id = UUID.randomUUID().toString();
        jdbc.update("insert into inventory(inventory_id,project_id,item_id,quantity,reserved_quantity,available_quantity,inventory_status) "
            + "values(?,?,?,10,0,10,'available')", id, DEMO_PROJECT, "itm_demo_mix_output");
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            entities.clear();
            Object reference = entities.getReference(Inventory.class, id);
            assertFalse(Hibernate.isInitialized(reference));
            JsonNode tree = read(stocks.findActiveStock(id).orElseThrow().json());
            org.junit.jupiter.api.Assertions.assertEquals(id, tree.path("inventoryId").asText());
            assertFalse(tree.has("hibernateLazyInitializer"));
        });
    }

    private JsonNode read(String value) {
        try {
            return json.readTree(value);
        } catch (Exception error) {
            throw new AssertionError("The Facts payload must be valid JSON", error);
        }
    }

    private enum Kind {
        ITEM(Item.class, "itm_demo_mix_output", "itemId"),
        ITEM_BATCH(Item.class, "itm_demo_mix_output", "itemId"),
        WORKFLOW(Workflow.class, DEMO_WORKFLOW, "workflowId"),
        WORKFLOW_LOCK(Workflow.class, DEMO_WORKFLOW, "workflowId"),
        PROCESS(Process.class, "prc_demo_mix", "processId"),
        PORT(ProcessIo.class, "pio_demo_mix_in", "processIoId");

        private final Class<?> type;
        private final String id;
        private final String idField;

        Kind(Class<?> type, String id, String idField) {
            this.type = type;
            this.id = id;
            this.idField = idField;
        }
    }
}
