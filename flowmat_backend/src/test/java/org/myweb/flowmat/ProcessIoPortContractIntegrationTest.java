package org.myweb.flowmat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@AutoConfigureMockMvc
class ProcessIoPortContractIntegrationTest extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtProvider jwtProvider;

    @Test
    void portContractIsStoredAndFrozenInPublishedRevision() throws Exception {
        String workflowId = data(post("/workflows")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Port contract "
                + UUID.randomUUID() + "\"}"))
            .path("workflowId").asText();
        String processId = data(post("/processes")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflowId + "\",\"processName\":\"Mixer\"}"))
            .path("processId").asText();
        JsonNode port = data(post("/process-ios")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"processId\":\"" + processId + "\",\"itemId\":\"itm_demo_mix_output\","
                + "\"direction\":\"input\",\"quantity\":2,\"unit\":\"kg\","
                + "\"role\":\"feed\",\"resourceType\":\"material\",\"requiredYn\":\"N\","
                + "\"schemaJson\":{\"type\":\"object\"},\"validationRule\":\"quantity > 0\"}"));
        String portId = port.path("processIoId").asText();
        org.junit.jupiter.api.Assertions.assertEquals("feed", port.path("role").asText());
        org.junit.jupiter.api.Assertions.assertEquals("object", port.path("schemaJson").path("type").asText());

        String revisionId = data(post("/workflows/" + workflowId + "/revisions"))
            .path("workflowRevisionId").asText();
        data(put("/process-ios/" + portId)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"product\",\"schemaJson\":{\"type\":\"object\","
                + "\"properties\":{\"batch\":{\"type\":\"string\"}}}}"));

        mockMvc.perform(auth(get("/process-ios/" + portId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.role").value("product"));
        mockMvc.perform(auth(get("/workflows/" + workflowId + "/revisions/" + revisionId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.snapshot.processIos[0].role").value("feed"))
            .andExpect(jsonPath("$.data.snapshot.processIos[0].schemaJson.type").value("object"));

        mockMvc.perform(auth(put("/process-ios/" + portId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"schemaJson\":[1,2]}")))
            .andExpect(status().isBadRequest());
        mockMvc.perform(auth(put("/process-ios/" + portId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"schemaJson\":{\"type\":\"string\"}}")))
            .andExpect(status().isBadRequest());
        mockMvc.perform(auth(put("/process-ios/" + portId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"schemaJson\":{\"type\":\"object\",\"properties\":{},"
                    + "\"required\":[\"missing\"]}}")))
            .andExpect(status().isBadRequest());
    }

    private JsonNode data(MockHttpServletRequestBuilder request) throws Exception {
        String json = mockMvc.perform(auth(request)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).path("data");
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request) {
        return request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(DEMO_OWNER));
    }
}
