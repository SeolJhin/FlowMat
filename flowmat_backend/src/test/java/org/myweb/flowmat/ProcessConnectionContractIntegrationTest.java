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
class ProcessConnectionContractIntegrationTest extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtProvider jwtProvider;

    @Test
    void connectionContractIsFrozenInRevisionAndRejectsNegativeCapacity() throws Exception {
        String workflowId = data(post("/workflows")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Connection contract "
                + UUID.randomUUID() + "\"}"))
            .path("workflowId").asText();
        String fromId = createProcess(workflowId, "Source");
        String toId = createProcess(workflowId, "Target");
        String connectionId = data(post("/process-connections")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflowId + "\",\"fromProcessId\":\"" + fromId
                + "\",\"toProcessId\":\"" + toId + "\",\"capacity\":12,"
                + "\"conditionExpr\":\"approved == true\",\"failurePolicy\":\"stop\"}"))
            .path("connectionId").asText();
        String revisionId = data(post("/workflows/" + workflowId + "/revisions"))
            .path("workflowRevisionId").asText();

        mockMvc.perform(auth(put("/process-connections/" + connectionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"capacity\":20,\"failurePolicy\":\"skip\"}")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.capacity").value(20))
            .andExpect(jsonPath("$.data.failurePolicy").value("skip"));
        mockMvc.perform(auth(get("/workflows/" + workflowId + "/revisions/" + revisionId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.snapshot.connections[0].capacity").value(12))
            .andExpect(jsonPath("$.data.snapshot.connections[0].conditionExpr").value("approved == true"))
            .andExpect(jsonPath("$.data.snapshot.connections[0].failurePolicy").value("stop"));
        mockMvc.perform(auth(put("/process-connections/" + connectionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"capacity\":-1}")))
            .andExpect(status().isBadRequest());
    }

    @Test
    void explicitPortsMustHaveCompatibleDirectionsAndResourceTypes() throws Exception {
        String workflowId = data(post("/workflows")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Port linkage "
                + UUID.randomUUID() + "\"}"))
            .path("workflowId").asText();
        String fromId = createProcess(workflowId, "Source");
        String toId = createProcess(workflowId, "Target");
        String outputId = createPort(fromId, "output", "material");
        String wrongSourceId = createPort(fromId, "input", "material");
        String wrongTypeId = createPort(toId, "input", "data");
        String wrongDirectionId = createPort(toId, "output", "material");
        String validInputId = createPort(toId, "input", "material");

        mockMvc.perform(auth(connect(workflowId, fromId, toId, outputId, wrongTypeId)))
            .andExpect(status().isBadRequest());
        mockMvc.perform(auth(connect(workflowId, fromId, toId, outputId, wrongDirectionId)))
            .andExpect(status().isBadRequest());
        mockMvc.perform(auth(connect(workflowId, fromId, toId, wrongSourceId, validInputId)))
            .andExpect(status().isBadRequest());
        mockMvc.perform(auth(connect(workflowId, fromId, toId, outputId, validInputId)))
            .andExpect(status().isOk());
    }

    private String createPort(String processId, String direction, String resourceType) throws Exception {
        return data(post("/process-ios")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"processId\":\"" + processId + "\",\"itemId\":\"itm_demo_mix_output\","
                + "\"direction\":\"" + direction + "\",\"quantity\":1,\"unit\":\"kg\","
                + "\"resourceType\":\"" + resourceType + "\"}"))
            .path("processIoId").asText();
    }

    private MockHttpServletRequestBuilder connect(String workflowId, String fromId, String toId,
        String fromIoId, String toIoId) {
        return post("/process-connections")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflowId + "\",\"fromProcessId\":\"" + fromId
                + "\",\"toProcessId\":\"" + toId + "\",\"fromIoId\":\"" + fromIoId
                + "\",\"toIoId\":\"" + toIoId + "\"}");
    }

    private String createProcess(String workflowId, String name) throws Exception {
        return data(post("/processes")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflowId + "\",\"processName\":\"" + name + "\"}"))
            .path("processId").asText();
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
