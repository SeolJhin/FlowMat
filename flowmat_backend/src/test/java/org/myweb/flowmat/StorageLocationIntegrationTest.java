package org.myweb.flowmat;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;
import org.myweb.flowmat.domain.catalog.repository.ItemRepository;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * The storage location list (docs/domain/storage-location.md) against real Postgres. Each test uses its own project:
 * once a project lists a place, free-text stock locations stop working there, which would break other tests in the demo
 * project.
 */
@AutoConfigureMockMvc
class StorageLocationIntegrationTest extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtProvider jwtProvider;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ItemRepository itemRepository;

    @Test
    void placesNestByKindAndCodesAreUniquePerProject() throws Exception {
        String project = project();
        String site = create(project, "S1", "site", null).path("locationId").asText();
        String warehouse = create(project, "WH1", "warehouse", site).path("locationId").asText();
        String zone = create(project, "Z1", "zone", warehouse).path("locationId").asText();
        String bin = create(project, "B1", "bin", zone).path("locationId").asText();

        call(post("/storage-locations"), body(project, "B2", "bin", bin))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("site > warehouse > zone > location > bin")));
        call(post("/storage-locations"), body(project, "WH2", "warehouse", zone)).andExpect(status().isBadRequest());
        call(post("/storage-locations"), body(project, "wh1", "warehouse", site)).andExpect(status().isConflict());
        call(post("/storage-locations"), body(project, "S2", "castle", null)).andExpect(status().isBadRequest());

        call(get("/storage-locations").param("projectId", project))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(4))
            .andExpect(jsonPath("$.data[0].locationCode").value("S1"))
            .andExpect(jsonPath("$.data[3].path").value("S1 / WH1 / Z1 / B1"))
            .andExpect(jsonPath("$.data[3].depth").value(3));

        // A zone holding a bin cannot become a bin, and a place cannot move inside its own bin.
        call(put("/storage-locations/" + zone), "{\"locationType\":\"bin\"}").andExpect(status().isBadRequest());
        call(put("/storage-locations/" + warehouse), "{\"parentLocationId\":\"" + bin + "\"}").andExpect(status().isBadRequest());
        call(put("/storage-locations/" + warehouse), "{\"parentLocationId\":\"" + warehouse + "\"}").andExpect(status().isBadRequest());
        call(put("/storage-locations/" + zone), "{\"clearParent\":true,\"locationName\":\"Cold zone\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.path").value("Z1"))
            .andExpect(jsonPath("$.data.locationName").value("Cold zone"));

        call(delete("/storage-locations/" + zone)).andExpect(status().isConflict());
        call(get("/storage-locations").param("projectId", project), "unrelated-user", null).andExpect(status().isForbidden());
    }

    @Test
    void aListedProjectPlacesNewStockOnlyAtActiveListedPlaces() throws Exception {
        String project = project();
        String item = item(project);
        // No list yet: any text is a place, as before.
        String loose = data(call(post("/inventories"), stock(project, item, "loose-shelf", "5"))).path("inventoryId").asText();

        call(post("/storage-locations/adopt-used").param("projectId", project))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].locationCode").value("loose-shelf"))
            .andExpect(jsonPath("$.data[0].stockRecords").value(1));
        String warehouse = create(project, "WH-2", "warehouse", null).path("locationId").asText();

        call(post("/inventories"), stock(project, item, "nowhere", "1"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("not in this project's location list")));
        String listed = data(call(post("/inventories"), stock(project, item, "wh-2", "3"))
            .andExpect(jsonPath("$.data.location").value("WH-2"))).path("inventoryId").asText();

        transfer(loose, "nowhere", "1").andExpect(status().isBadRequest());
        transfer(loose, "wh-2", "2")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.in.inventoryId").value(listed));

        call(put("/storage-locations/" + warehouse), "{\"active\":false}")
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(containsString("still holds stock")));
        call(delete("/storage-locations/" + warehouse)).andExpect(status().isConflict());
        call(put("/storage-locations/" + warehouse), "{\"locationCode\":\"WH-9\"}").andExpect(status().isConflict());

        transfer(listed, "loose-shelf", "5").andExpect(status().isOk());
        call(put("/storage-locations/" + warehouse), "{\"active\":false}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.active").value(false));
        call(post("/inventories"), stock(project, item, "WH-2", "1")).andExpect(status().isConflict());
        call(post("/inventories/import"), "{\"projectId\":\"" + project + "\",\"dryRun\":true,\"rows\":[{\"itemCode\":\""
            + item.toUpperCase() + "\",\"quantity\":\"1\",\"location\":\"attic\"}]}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.errors").value(1))
            .andExpect(jsonPath("$.data.rows[0].message").value(containsString("attic is not in this project's location list")));

        call(delete("/storage-locations/" + warehouse)).andExpect(status().isOk());
        call(get("/storage-locations").param("projectId", project))
            .andExpect(jsonPath("$.data.length()").value(1));
    }

    private JsonNode create(String project, String code, String type, String parent) throws Exception {
        return data(call(post("/storage-locations"), body(project, code, type, parent)));
    }

    private static String body(String project, String code, String type, String parent) {
        return "{\"projectId\":\"" + project + "\",\"locationCode\":\"" + code + "\",\"locationType\":\"" + type + "\""
            + (parent == null ? "" : ",\"parentLocationId\":\"" + parent + "\"") + "}";
    }

    private static String stock(String project, String item, String location, String quantity) {
        return "{\"projectId\":\"" + project + "\",\"itemId\":\"" + item + "\",\"quantity\":" + quantity
            + ",\"location\":\"" + location + "\"}";
    }

    private ResultActions transfer(String fromInventoryId, String toLocation, String quantity) throws Exception {
        return call(post("/inventory-transfers"), "{\"fromInventoryId\":\"" + fromInventoryId + "\",\"toLocation\":\""
            + toLocation + "\",\"quantity\":" + quantity + ",\"requestId\":\"" + UUID.randomUUID() + "\"}");
    }

    private String project() throws Exception {
        return data(call(post("/projects"), "{\"projectName\":\"Locations " + suffix() + "\",\"ownerId\":\"" + DEMO_OWNER + "\"}"))
            .path("projectId").asText();
    }

    private String item(String project) {
        String id = "itm-loc-" + suffix();
        Item item = new Item();
        item.setItemId(id);
        item.setProjectId(project);
        item.setItemCode(id.toUpperCase());
        item.setItemName(id);
        item.setItemType("material");
        item.setResourceCategory("material");
        item.setUnitId("unit_kg");
        item.setItemStatus("active");
        item.setLotManageYn("N");
        item.setDeletedYn("N");
        itemRepository.save(item);
        return id;
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return call(request, DEMO_OWNER, null);
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String body) throws Exception {
        return call(request, DEMO_OWNER, body);
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String user, String body) throws Exception {
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(user)));
    }

    private JsonNode data(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data");
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
