package org.myweb.flowmat;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.domain.project.domain.entity.ProjectMember;
import org.myweb.flowmat.domain.project.repository.ProjectMemberRepository;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Inspections and defects (docs/domain/quality-inspection.md) against real Postgres. */
@AutoConfigureMockMvc
class QualityIntegrationTest extends IntegrationTestSupport {

    private static final String EDITOR = "quality-editor";
    private static final String VIEWER = "quality-viewer";
    private static final String OUTSIDER = "quality-outsider";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtProvider jwtProvider;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ProjectMemberRepository projectMemberRepository;

    @Test
    void aFailedMeasurementQuarantinesTheLotAndKeepsItOutOfProduction() throws Exception {
        Batch batch = finishedBatch();

        String inspectionId = id(inspect("{\"productionRunId\":\"" + batch.runId + "\",\"lotId\":\"" + batch.productLot
            + "\",\"inspectionType\":\"Moisture\",\"measuredValue\":14.2,\"standardMin\":10,\"standardMax\":12,"
            + "\"unit\":\"%\",\"quarantineLot\":true}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resultStatus").value("fail"))
            .andExpect(jsonPath("$.data.itemId").value(batch.product))
            .andExpect(jsonPath("$.data.runNumber").value(batch.runNumber))
            .andExpect(jsonPath("$.data.lotStatus").value("quarantined"))
            .andExpect(jsonPath("$.data.inspectedBy").value(DEMO_OWNER)), "inspectionId");

        // The whole LOT is held through the ordinary stock command, which points back at the inspection.
        call(get("/inventories/" + batch.productStock)).andExpect(jsonPath("$.data.inventoryStatus").value("quarantined"));
        call(get("/inventory-transactions?projectId=" + DEMO_PROJECT + "&inventoryId=" + batch.productStock))
            .andExpect(jsonPath("$.data[?(@.transactionType == 'quarantine')].referenceId").value(hasItem(inspectionId)));
        String nextRun = startRun();
        call(post("/production-runs/" + nextRun + "/items"), recording(batch.productStock, batch.product, "input", "1"))
            .andExpect(status().isConflict());

        // A later pass is recorded next to the failure; releasing the LOT stays a separate stock action.
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Moisture\",\"measuredValue\":11,"
            + "\"standardMin\":10,\"standardMax\":12}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resultStatus").value("pass"))
            .andExpect(jsonPath("$.data.productionRunId").value(nullValue()))
            .andExpect(jsonPath("$.data.lotStatus").value("quarantined"));
        call(get("/quality-inspections?projectId=" + DEMO_PROJECT + "&lotId=" + batch.productLot))
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].resultStatus").value("pass"))
            .andExpect(jsonPath("$.data[1].resultStatus").value("fail"));
        call(get("/quality-inspections?projectId=" + DEMO_PROJECT + "&productionRunId=" + batch.runId))
            .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void theResultAndTheTargetAreChecked() throws Exception {
        Batch batch = finishedBatch();
        String otherLot = createLot(batch.product);
        String loose = item(false);

        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Visual\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Give the result")));
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Weight\",\"measuredValue\":5,\"standardMin\":4,"
            + "\"standardMax\":6,\"result\":\"fail\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("is within the limits, so the result is pass")));
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Weight\",\"measuredValue\":5,\"standardMin\":6,"
            + "\"standardMax\":4}")
            .andExpect(status().isBadRequest());
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Visual\",\"result\":\"maybe\"}")
            .andExpect(status().isBadRequest());
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Visual\",\"result\":\"pass\",\"quarantineLot\":true}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Only a failed inspection")));
        inspect("{\"itemId\":\"" + loose + "\",\"inspectionType\":\"Visual\",\"result\":\"fail\",\"quarantineLot\":true}")
            .andExpect(status().isBadRequest());
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"itemId\":\"" + batch.raw + "\",\"inspectionType\":\"Visual\","
            + "\"result\":\"pass\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("different item")));
        inspect("{\"productionRunId\":\"" + batch.runId + "\",\"lotId\":\"" + otherLot + "\",\"inspectionType\":\"Visual\","
            + "\"result\":\"pass\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("was not used or made by run")));
        inspect("{\"inspectionType\":\"Visual\",\"result\":\"pass\"}")
            .andExpect(status().isBadRequest());

        // An upper limit alone is enough to decide; an item without a LOT can be inspected.
        inspect("{\"itemId\":\"" + loose + "\",\"inspectionType\":\"Weight\",\"measuredValue\":5,\"standardMax\":4}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resultStatus").value("fail"))
            .andExpect(jsonPath("$.data.lotId").value(nullValue()));
        // The run's own input LOT belongs to it too.
        inspect("{\"productionRunId\":\"" + batch.runId + "\",\"lotId\":\"" + batch.rawLot + "\",\"inspectionType\":\"Visual\","
            + "\"result\":\"pass\"}")
            .andExpect(status().isOk());
    }

    @Test
    void aDefectFollowsItsInspectionAndIsResolvedOnce() throws Exception {
        Batch batch = finishedBatch();
        String inspectionId = id(inspect("{\"productionRunId\":\"" + batch.runId + "\",\"lotId\":\"" + batch.productLot
            + "\",\"inspectionType\":\"Visual\",\"result\":\"fail\"}").andExpect(status().isOk()), "inspectionId");

        String defectId = id(defect("{\"inspectionId\":\"" + inspectionId + "\",\"quantity\":2,\"defectType\":\"Crack\","
            + "\"severity\":\"Major\",\"reason\":\"Cooling too fast\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.productionRunId").value(batch.runId))
            .andExpect(jsonPath("$.data.lotId").value(batch.productLot))
            .andExpect(jsonPath("$.data.itemId").value(batch.product))
            .andExpect(jsonPath("$.data.unit").value("kg"))
            .andExpect(jsonPath("$.data.severity").value("major"))
            .andExpect(jsonPath("$.data.resolved").value(false)), "defectLogId");

        defect("{\"inspectionId\":\"" + inspectionId + "\",\"lotId\":\"" + batch.rawLot + "\",\"quantity\":1,\"defectType\":\"Crack\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("differs from the inspection")));
        defect("{\"lotId\":\"" + batch.productLot + "\",\"quantity\":1,\"defectType\":\"Crack\",\"severity\":\"huge\"}")
            .andExpect(status().isBadRequest());
        defect("{\"lotId\":\"" + batch.productLot + "\",\"quantity\":0,\"defectType\":\"Crack\"}")
            .andExpect(status().isBadRequest());
        defect("{\"productionRunId\":\"" + batch.runId + "\",\"quantity\":1,\"defectType\":\"Crack\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("Pick the item")));

        call(get("/defects?projectId=" + DEMO_PROJECT + "&productionRunId=" + batch.runId + "&openOnly=true"))
            .andExpect(jsonPath("$.data[*].defectLogId").value(hasItem(defectId)));
        call(post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\" \"}").andExpect(status().isBadRequest());
        call(post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\"Scrapped the cracked pieces\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resolved").value(true))
            .andExpect(jsonPath("$.data.resolvedBy").value(DEMO_OWNER))
            .andExpect(jsonPath("$.data.actionTaken").value("Scrapped the cracked pieces"));
        call(post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\"Again\"}").andExpect(status().isConflict());
        call(get("/defects?projectId=" + DEMO_PROJECT + "&productionRunId=" + batch.runId + "&openOnly=true"))
            .andExpect(jsonPath("$.data[*].defectLogId").value(not(hasItem(defectId))));

        // Logging and resolving defects moves no stock.
        call(get("/inventories/" + batch.productStock)).andExpect(jsonPath("$.data.quantity").value(4));
    }

    @Test
    void resolvingADefectCanScrapTheDefectiveStockEvenWhenQuarantined() throws Exception {
        Batch batch = finishedBatch();
        inspect("{\"lotId\":\"" + batch.productLot + "\",\"inspectionType\":\"Visual\",\"result\":\"fail\",\"quarantineLot\":true}")
            .andExpect(status().isOk());
        String defectId = id(defect("{\"lotId\":\"" + batch.productLot + "\",\"quantity\":3,\"defectType\":\"Burnt\"}")
            .andExpect(status().isOk()), "defectLogId");
        String otherStock = id(createStock(batch.raw, batch.rawLot, "0"), "inventoryId");

        // Only stock of the defect's item and LOT, both fields together, and no more than is there.
        call(post("/defects/" + defectId + "/resolve"),
            "{\"actionTaken\":\"Binned\",\"scrapInventoryId\":\"" + otherStock + "\",\"scrapQuantity\":1}")
            .andExpect(status().isBadRequest());
        call(post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\"Binned\",\"scrapQuantity\":1}")
            .andExpect(status().isBadRequest());
        call(post("/defects/" + defectId + "/resolve"),
            "{\"actionTaken\":\"Binned\",\"scrapInventoryId\":\"" + batch.productStock + "\",\"scrapQuantity\":9}")
            .andExpect(status().isConflict());

        call(post("/defects/" + defectId + "/resolve"),
            "{\"actionTaken\":\"Binned\",\"scrapInventoryId\":\"" + batch.productStock + "\",\"scrapQuantity\":3}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resolved").value(true))
            .andExpect(jsonPath("$.data.actionTaken").value(containsString("Binned (scrapped 3 from")));
        call(get("/inventories/" + batch.productStock))
            .andExpect(jsonPath("$.data.quantity").value(1))
            .andExpect(jsonPath("$.data.inventoryStatus").value("quarantined"));
        call(get("/inventory-transactions?projectId=" + DEMO_PROJECT + "&inventoryId=" + batch.productStock))
            .andExpect(jsonPath("$.data[0].transactionType").value("adjustment"))
            .andExpect(jsonPath("$.data[0].quantityDelta").value(-3))
            .andExpect(jsonPath("$.data[0].referenceType").value("defect_log"))
            .andExpect(jsonPath("$.data[0].referenceId").value(defectId));
    }

    @Test
    void membersSeeQualityRecordsAndEditorsWriteThem() throws Exception {
        ensureMember(EDITOR, "editor");
        ensureMember(VIEWER, "viewer");
        Batch batch = finishedBatch();
        String body = "{\"projectId\":\"" + DEMO_PROJECT + "\",\"lotId\":\"" + batch.productLot
            + "\",\"inspectionType\":\"Visual\",\"result\":\"pass\"}";

        callAs(OUTSIDER, get("/quality-inspections?projectId=" + DEMO_PROJECT), null).andExpect(status().isForbidden());
        callAs(VIEWER, get("/quality-inspections?projectId=" + DEMO_PROJECT), null).andExpect(status().isOk());
        callAs(VIEWER, post("/quality-inspections"), body).andExpect(status().isForbidden());
        callAs(EDITOR, post("/quality-inspections"), body).andExpect(status().isOk());

        String defectId = id(callAs(EDITOR, post("/defects"), "{\"projectId\":\"" + DEMO_PROJECT + "\",\"lotId\":\""
            + batch.productLot + "\",\"quantity\":1,\"defectType\":\"Scratch\"}").andExpect(status().isOk()), "defectLogId");
        callAs(VIEWER, post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\"Polished\"}").andExpect(status().isForbidden());
        callAs(OUTSIDER, get("/defects?projectId=" + DEMO_PROJECT), null).andExpect(status().isForbidden());
        callAs(EDITOR, post("/defects/" + defectId + "/resolve"), "{\"actionTaken\":\"Polished\"}").andExpect(status().isOk());
    }

    // ---- helpers ----

    /** A finished run: 5 kg of a raw LOT in, 4 kg of a product LOT out. */
    private record Batch(String raw, String rawLot, String product, String productLot, String productStock, String runId,
                         String runNumber) {
    }

    private Batch finishedBatch() throws Exception {
        String raw = item(true);
        String product = item(true);
        String rawLot = createLot(raw);
        String productLot = createLot(product);
        String rawStock = id(createStock(raw, rawLot, "20"), "inventoryId");
        String productStock = id(createStock(product, productLot, "0"), "inventoryId");
        String runId = startRun();
        call(post("/production-runs/" + runId + "/items"), recording(rawStock, raw, "input", "5")).andExpect(status().isOk());
        call(post("/production-runs/" + runId + "/items"), recording(productStock, product, "output", "4")).andExpect(status().isOk());
        call(post("/production-runs/" + runId + "/finish"), "{\"actualOutputQty\":4}").andExpect(status().isOk());
        String runNumber = id(call(get("/production-runs/" + runId)), "runNumber");
        return new Batch(raw, rawLot, product, productLot, productStock, runId, runNumber);
    }

    private ResultActions inspect(String fields) throws Exception {
        return call(post("/quality-inspections"), withProject(fields));
    }

    private ResultActions defect(String fields) throws Exception {
        return call(post("/defects"), withProject(fields));
    }

    private static String withProject(String fields) {
        return "{\"projectId\":\"" + DEMO_PROJECT + "\"," + fields.substring(1);
    }

    private static String recording(String inventoryId, String itemId, String direction, String qty) {
        return "{\"inventoryId\":\"" + inventoryId + "\",\"itemId\":\"" + itemId + "\",\"direction\":\"" + direction
            + "\",\"plannedQty\":" + qty + ",\"actualQty\":" + qty + ",\"unit\":\"kg\"}";
    }

    private void ensureMember(String userId, String role) {
        if (projectMemberRepository.existsByProjectIdAndUserIdAndMemberStatus(DEMO_PROJECT, userId, "active")) {
            return;
        }
        ProjectMember member = new ProjectMember();
        member.setProjectMemberId("pm-qual-" + UUID.randomUUID().toString().substring(0, 8));
        member.setProjectId(DEMO_PROJECT);
        member.setUserId(userId);
        member.setProjectRole(role);
        member.setMemberStatus("active");
        member.setInvitedBy(DEMO_OWNER);
        member.setJoinedAt(OffsetDateTime.now());
        projectMemberRepository.save(member);
    }

    private String item(boolean lotTracked) {
        String id = "itm-qual-" + suffix();
        Item item = new Item();
        item.setItemId(id);
        item.setProjectId(DEMO_PROJECT);
        item.setItemCode(id.toUpperCase());
        item.setItemName(id);
        item.setItemType("material");
        item.setResourceCategory("material");
        item.setUnitId("unit_kg");
        item.setItemStatus("active");
        item.setLotManageYn(lotTracked ? "Y" : "N");
        item.setDeletedYn("N");
        itemRepository.save(item);
        return id;
    }

    private String createLot(String itemId) throws Exception {
        return id(call(post("/lots"), "{\"projectId\":\"" + DEMO_PROJECT + "\",\"itemId\":\"" + itemId + "\",\"lotNo\":\"QA-"
            + suffix() + "\"}").andExpect(status().isOk()), "lotId");
    }

    private ResultActions createStock(String itemId, String lotId, String quantity) throws Exception {
        return call(post("/inventories"), "{\"projectId\":\"" + DEMO_PROJECT + "\",\"itemId\":\"" + itemId + "\",\"quantity\":"
            + quantity + ",\"location\":\"WH-" + suffix().substring(0, 6) + "\",\"lotId\":\"" + lotId + "\"}")
            .andExpect(status().isOk());
    }

    private String startRun() throws Exception {
        return id(call(post("/production-runs/start"), "{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowId\":\""
            + DEMO_WORKFLOW + "\",\"plannedOutputQty\":1}").andExpect(status().isOk()), "productionRunId");
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return callAs(DEMO_OWNER, request, null);
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String body) throws Exception {
        return callAs(DEMO_OWNER, request, body);
    }

    private ResultActions callAs(String userId, MockHttpServletRequestBuilder request, String body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(userId)));
    }

    private String id(ResultActions result, String field) throws Exception {
        JsonNode data = objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).path("data");
        return data.path(field).asText();
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
