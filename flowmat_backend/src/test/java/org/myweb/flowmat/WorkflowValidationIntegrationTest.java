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
import org.myweb.flowmat.domain.workflow.repository.ProcessConnectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@AutoConfigureMockMvc
class WorkflowValidationIntegrationTest extends IntegrationTestSupport {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtProvider tokens;
    @Autowired private ProcessConnectionRepository connections;

    @Test
    void demoGraphHasNoErrorsAndMissingSchemasAreWarnings() throws Exception {
        mockMvc.perform(auth(get("/workflows/" + DEMO_WORKFLOW + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.errors").value(0))
            .andExpect(jsonPath("$.data.issues[?(@.code == 'SCHEMA_UNVERIFIED')]").isNotEmpty());
    }

    @Test
    void requiredInputWithoutConnectionIsAnErrorAndOutsiderCannotReadReport() throws Exception {
        String workflow = data(post("/workflows").contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Validation "
                + UUID.randomUUID() + "\"}")) .path("workflowId").asText();
        String process = data(post("/processes").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflow + "\",\"processName\":\"Needs input\"}"))
            .path("processId").asText();
        data(post("/process-ios").contentType(MediaType.APPLICATION_JSON)
            .content("{\"processId\":\"" + process + "\",\"itemId\":\"itm_demo_mix_output\","
                + "\"direction\":\"input\",\"quantity\":1,\"unit\":\"kg\",\"requiredYn\":\"Y\"}"));

        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.errors").value(1))
            .andExpect(jsonPath("$.data.issues[?(@.code == 'REQUIRED_INPUT_UNCONNECTED')]").isNotEmpty())
            .andExpect(jsonPath("$.data.issues[?(@.code == 'PROCESS_ISOLATED')]").isNotEmpty());
        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), "unrelated-user"))
            .andExpect(status().isForbidden());
    }

    @Test
    void cyclesAreWarningsAndLegacyMalformedExpressionsAreErrors() throws Exception {
        String workflow = data(post("/workflows").contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":\"" + DEMO_PROJECT + "\",\"workflowName\":\"Cycle "
                + UUID.randomUUID() + "\"}")) .path("workflowId").asText();
        String first = data(post("/processes").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflow + "\",\"processName\":\"First\"}"))
            .path("processId").asText();
        String second = data(post("/processes").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflow + "\",\"processName\":\"Second\"}"))
            .path("processId").asText();
        String connectionId = data(post("/process-connections").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflow + "\",\"fromProcessId\":\"" + first
                + "\",\"toProcessId\":\"" + second + "\"}")) .path("connectionId").asText();
        data(post("/process-connections").contentType(MediaType.APPLICATION_JSON)
            .content("{\"workflowId\":\"" + workflow + "\",\"fromProcessId\":\"" + second
                + "\",\"toProcessId\":\"" + first + "\"}"));

        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.errors").value(0))
            .andExpect(jsonPath("$.data.issues[?(@.code == 'CYCLE')]").isNotEmpty());

        // Simulate a condition stored before the parser contract was enforced.
        var connection = connections.findById(connectionId).orElseThrow();
        connection.setConditionExpr("sum(quantity) > 0");
        connections.saveAndFlush(connection);
        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[?(@.code == 'EXPRESSION_INVALID')]").isNotEmpty());

        connection.setConditionExpr(null);
        connection.setFromIoId("deleted-port");
        connections.saveAndFlush(connection);
        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[?(@.code == 'CONNECTION_ORPHAN')]").isNotEmpty());

        connection.setFromIoId(null);
        connection.setFromProcessId(second);
        connections.saveAndFlush(connection);
        mockMvc.perform(auth(get("/workflows/" + workflow + "/validation"), DEMO_OWNER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.issues[?(@.code == 'CONNECTION_INCOMPATIBLE')]").isNotEmpty());
    }

    private JsonNode data(MockHttpServletRequestBuilder request) throws Exception {
        return mapper.readTree(mockMvc.perform(auth(request, DEMO_OWNER)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString()).path("data");
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String user) {
        return request.header("Authorization", "Bearer " + tokens.generateAccessToken(user));
    }
}
