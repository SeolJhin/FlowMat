package org.myweb.flowmat.global.exception;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.myweb.flowmat.domain.production.api.ProductionRunController;
import org.myweb.flowmat.domain.production.application.ProductionRunService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

class RequestParameterExceptionRegressionTest {
    private final ProductionRunService service = mock(ProductionRunService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ProductionRunController(service))
        .setControllerAdvice(new GlobalExceptionHandler()).build();

    @ParameterizedTest
    @ValueSource(strings = {"", "?projectId=prj_demo_main", "?workflowID=wf_demo_main"})
    void missingWorkflowIdIsAClientErrorBeforeCallingTheService(String query) throws Exception {
        mvc.perform(get("/production-runs" + query))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("workflowId is required."))
            .andExpect(jsonPath("$.data").isEmpty());

        verifyNoInteractions(service);
    }

    @Test
    void aRequiredParameterConvertedToNullIsAlsoAClientError() throws Exception {
        MockMvc conversion = MockMvcBuilders.standaloneSetup(new ConvertedParameterController())
            .setControllerAdvice(new GlobalExceptionHandler()).build();

        conversion.perform(get("/converted").param("count", ""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("count is required."));
    }

    @Test
    void aPresentWorkflowIdStillReachesTheService() throws Exception {
        when(service.listRuns("wf_demo_main")).thenReturn(List.of());

        mvc.perform(get("/production-runs").param("workflowId", "wf_demo_main"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isEmpty());

        verify(service).listRuns("wf_demo_main");
    }

    @RestController
    static class ConvertedParameterController {
        @GetMapping("/converted")
        String converted(@RequestParam("count") Integer count) {
            return "ok";
        }
    }
}
