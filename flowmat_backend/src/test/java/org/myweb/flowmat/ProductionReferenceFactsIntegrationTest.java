package org.myweb.flowmat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.workflow.application.publicapi.WorkflowProductionQuery;
import org.myweb.flowmat.domain.catalog.application.publicapi.CatalogItemFactsQuery;
import org.myweb.flowmat.domain.inventory.application.publicapi.StockFactsQuery;
import org.myweb.flowmat.domain.workflow.repository.*;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import static org.junit.jupiter.api.Assertions.*;

class ProductionReferenceFactsIntegrationTest extends IntegrationTestSupport {
    @Autowired WorkflowProductionQuery workflows;
    @Autowired CatalogItemFactsQuery items;
    @Autowired StockFactsQuery stocks;
    @Autowired WorkflowRepository workflowRepository;
    @Autowired ProcessRepository processRepository;
    @Autowired ProcessIoRepository ioRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired ObjectMapper json;
    @Test void legacyRuleFactsKeepAllFieldsAndAuditValuesAcrossPublicBoundaries() throws Exception {
        assertEquals(json.readTree(json.writeValueAsString(workflowRepository.findById(DEMO_WORKFLOW).orElseThrow())),
            json.readTree(workflows.findWorkflow(DEMO_WORKFLOW).orElseThrow().json()));
        assertEquals(json.readTree(json.writeValueAsString(processRepository.findById("prc_demo_mix").orElseThrow())),
            json.readTree(workflows.findProcess("prc_demo_mix").orElseThrow().json()));
        assertEquals(json.readTree(json.writeValueAsString(ioRepository.findById("pio_demo_mix_in").orElseThrow())),
            json.readTree(workflows.findProcessIo("pio_demo_mix_in").orElseThrow().json()));
        assertEquals(json.readTree(json.writeValueAsString(itemRepository.findById("itm_demo_mix_output").orElseThrow())),
            json.readTree(items.findActiveItem("itm_demo_mix_output").orElseThrow().json()));
        assertTrue(stocks.findActiveStock("missing").isEmpty());
        assertTrue(workflows.findWorkflow("missing").isEmpty());
        assertTrue(workflows.findProcess("missing").isEmpty());
        assertTrue(workflows.findProcessIo("missing").isEmpty());
        assertTrue(items.findActiveItem("missing").isEmpty());
    }
}
