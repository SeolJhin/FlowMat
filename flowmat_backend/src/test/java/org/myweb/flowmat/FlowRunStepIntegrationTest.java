package org.myweb.flowmat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class FlowRunStepIntegrationTest extends IntegrationTestSupport {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtProvider jwtProvider;

    @Test
    void stepAttemptsAndEventsKeepARevisionPinnedHistory() throws Exception {
        String workflowId = data(post("/workflows").contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Step "
                + UUID.randomUUID() + "\"}")).path("workflowId").asText();
        String nodeId = data(post("/processes").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflowId + "\",\"processName\":\"Mix\"}"))
            .path("processId").asText();
        String revisionId = data(post("/workflows/" + workflowId + "/revisions"))
            .path("workflowRevisionId").asText();
        String runId = data(post("/flow-runs").contentType(MediaType.APPLICATION_JSON)
            .header("X-Request-Id", "flow-step-contract-start")
            .content("{\"workflowId\":\"" + workflowId + "\",\"workflowRevisionId\":\""
                + revisionId + "\",\"runType\":\"test\"}"))
            .path("flowRunId").asText();
        mockMvc.perform(auth(post("/flow-runs/" + runId + "/steps")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nodeId\":\"missing\"}")))
            .andExpect(status().isBadRequest());

        String stepId = data(post("/flow-runs/" + runId + "/steps")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nodeId\":\"" + nodeId + "\",\"inputSnapshot\":{\"kg\":5}}"))
            .path("stepId").asText();
        mockMvc.perform(get("/flow-runs/" + runId + "/steps")
                .header("Authorization", "Bearer " + jwtProvider.generateAccessToken("unrelated-user")))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/flow-runs/" + runId + "/steps/" + stepId + "/start")
                .header("Authorization", "Bearer " + jwtProvider.generateAccessToken("unrelated-user")))
            .andExpect(status().isForbidden());
        mockMvc.perform(auth(post("/flow-runs/" + runId + "/finish")
                .contentType(MediaType.APPLICATION_JSON).content("{}")))
            .andExpect(status().isConflict());
        data(post("/flow-runs/" + runId + "/steps/" + stepId + "/start"));
        mockMvc.perform(auth(post("/flow-runs/" + runId + "/steps/" + stepId + "/start")))
            .andExpect(status().isConflict());
        data(post("/flow-runs/" + runId + "/steps/" + stepId + "/fail")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"errorCode\":\"MACHINE_STOP\",\"errorMessage\":\"Stopped\"}"));
        mockMvc.perform(auth(post("/flow-runs/" + runId + "/finish")
                .contentType(MediaType.APPLICATION_JSON).content("{}")))
            .andExpect(status().isConflict());
        data(post("/flow-runs/" + runId + "/steps/" + stepId + "/retry"));
        data(post("/flow-runs/" + runId + "/steps/" + stepId + "/complete")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"outputSnapshot\":{\"kg\":4}}"));

        mockMvc.perform(auth(get("/flow-runs/" + runId + "/steps")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].nodeId").value(nodeId))
            .andExpect(jsonPath("$.data[0].status").value("completed"))
            .andExpect(jsonPath("$.data[0].inputSnapshot.kg").value(5))
            .andExpect(jsonPath("$.data[0].outputSnapshot.kg").value(4));
        mockMvc.perform(auth(get("/flow-runs/" + runId + "/steps/" + stepId + "/attempts")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].status").value("failed"))
            .andExpect(jsonPath("$.data[0].errorCode").value("MACHINE_STOP"))
            .andExpect(jsonPath("$.data[1].status").value("completed"));
        mockMvc.perform(auth(get("/flow-runs/" + runId + "/events")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(6))
            .andExpect(jsonPath("$.data[0].eventType").value("run_started"))
            .andExpect(jsonPath("$.data[0].requestId").value("flow-step-contract-start"))
            .andExpect(jsonPath("$.data[0].actorType").value("user"));
        data(post("/flow-runs/" + runId + "/finish")
            .contentType(MediaType.APPLICATION_JSON).content("{}"));
        mockMvc.perform(auth(get("/flow-runs/" + runId + "/events")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(7))
            .andExpect(jsonPath("$.data[6].eventType").value("run_finished"));
        mockMvc.perform(auth(post("/flow-runs/" + runId + "/steps")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nodeId\":\"" + nodeId + "\"}")))
            .andExpect(status().isConflict());
    }

    private JsonNode data(MockHttpServletRequestBuilder request) throws Exception {
        return objectMapper.readTree(mockMvc.perform(auth(request)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString()).path("data");
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request) {
        return request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(DEMO_OWNER));
    }
}
