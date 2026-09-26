package org.myweb.flowmat;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Draft BOM materials from a spreadsheet (docs/domain/item-import.md "BOM 자재") against real Postgres. */
@AutoConfigureMockMvc
class BomLineImportIntegrationTest extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtProvider jwtProvider;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void theFileIsCheckedWithTheApprovalRulesAndSavedWholeOrNotAtAll() throws Exception {
        String tag = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String bread = item("BLI-BREAD-" + tag, "unit_ea");
        String flour = item("BLI-FLOUR-" + tag, "unit_kg");
        String salt = item("BLI-SALT-" + tag, "unit_kg");
        String dough = item("BLI-DOUGH-" + tag, "unit_kg");
        // Dough has an approved BOM of its own, so it cannot be a material yet (single level only).
        String doughBom = id(call(post("/boms"), json(Map.of("projectId", DEMO_PROJECT, "targetItemId", dough, "bomName", "Dough " + tag,
            "baseQuantity", 1, "baseUnit", "kg"))), "bomId");
        call(post("/boms/" + doughBom + "/lines"), json(Map.of("childItemId", flour, "quantity", 1, "unit", "kg"))).andExpect(status().isOk());
        call(post("/boms/" + doughBom + "/submit")).andExpect(status().isOk());
        call(post("/boms/" + doughBom + "/approve")).andExpect(status().isOk());

        String bomId = id(call(post("/boms"), json(Map.of("projectId", DEMO_PROJECT, "targetItemId", bread, "bomName", "Bread " + tag,
            "baseQuantity", 10, "baseUnit", "ea"))), "bomId");
        call(post("/boms/" + bomId + "/lines"), json(Map.of("childItemId", salt, "quantity", 1, "unit", "kg"))).andExpect(status().isOk());

        Map<String, String> flourLine = row("itemCode", "BLI-FLOUR-" + tag, "quantity", "5000", "unit", "g");
        importLines(bomId, false, false, flourLine,
                row("itemCode", "BLI-SALT-" + tag, "quantity", "200", "unit", "g"),
                row("itemCode", "BLI-BREAD-" + tag, "quantity", "1", "unit", "ea"),
                row("itemCode", "BLI-DOUGH-" + tag, "quantity", "2", "unit", "kg"),
                row("itemCode", "NOPE-" + tag, "quantity", "1", "unit", "kg"),
                row("itemCode", "BLI-FLOUR-" + tag, "quantity", "0", "unit", "ea"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.applied").value(false))
            .andExpect(jsonPath("$.data.added").value(1))
            .andExpect(jsonPath("$.data.errors").value(5))
            .andExpect(jsonPath("$.data.rows[1].message").value(containsString("already a material")))
            .andExpect(jsonPath("$.data.rows[2].message").value(containsString("item this BOM produces")))
            .andExpect(jsonPath("$.data.rows[3].message").value(containsString("its own approved BOM")))
            .andExpect(jsonPath("$.data.rows[4].message").value(containsString("No item has code")))
            .andExpect(jsonPath("$.data.rows[5].message").value(containsString("greater than 0")))
            .andExpect(jsonPath("$.data.rows[5].message").value(containsString("Cannot record ea")));
        call(get("/boms/" + bomId)).andExpect(jsonPath("$.data.lines.length()").value(1));

        // Added to the salt line that is there, in the unit written; or replacing it.
        importLines(bomId, false, false, flourLine)
            .andExpect(jsonPath("$.data.applied").value(true))
            .andExpect(jsonPath("$.data.added").value(1))
            .andExpect(jsonPath("$.data.removed").value(0));
        call(get("/boms/" + bomId))
            .andExpect(jsonPath("$.data.lines.length()").value(2))
            .andExpect(jsonPath("$.data.lines[1].unit").value("g"))
            .andExpect(jsonPath("$.data.lines[1].quantity").value(5000.0));
        importLines(bomId, true, true, flourLine, row("itemCode", "BLI-SALT-" + tag, "quantity", "0.2", "unit", "kg"))
            .andExpect(jsonPath("$.data.removed").value(2))
            .andExpect(jsonPath("$.data.applied").value(false));
        importLines(bomId, false, true, flourLine, row("itemCode", "BLI-SALT-" + tag, "quantity", "0.2", "unit", "kg"))
            .andExpect(jsonPath("$.data.applied").value(true));
        call(get("/boms/" + bomId)).andExpect(jsonPath("$.data.lines.length()").value(2));

        // The imported draft passes approval; an approved BOM takes no more lines.
        call(post("/boms/" + bomId + "/submit")).andExpect(status().isOk());
        call(post("/boms/" + bomId + "/approve")).andExpect(status().isOk());
        importLines(bomId, true, false, flourLine).andExpect(status().isConflict());
        importLines(doughBom, true, false).andExpect(status().isConflict());
    }

    // ---- helpers ----

    @SafeVarargs
    private ResultActions importLines(String bomId, boolean dryRun, boolean replace, Map<String, String>... rows) throws Exception {
        return call(post("/boms/" + bomId + "/lines/import"), json(Map.of("dryRun", dryRun, "replace", replace, "rows", List.of(rows))));
    }

    private String item(String code, String unitId) throws Exception {
        return id(call(post("/items"), json(Map.of("projectId", DEMO_PROJECT, "itemCode", code, "itemName", code.toLowerCase(),
            "unitId", unitId))), "itemId");
    }

    private static Map<String, String> row(String... pairs) {
        Map<String, String> row = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            row.put(pairs[i], pairs[i + 1]);
        }
        return row;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private String id(ResultActions result, String field) throws Exception {
        return objectMapper.readTree(result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
            .path("data").path(field).asText();
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(DEMO_OWNER)));
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String body) throws Exception {
        return call(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
