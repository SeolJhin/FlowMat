package org.myweb.flowmat.domain.flowrun.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;

class FlowRunGraphTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void routesOnlyWhenConditionPassesAndCapacityAndUnitMatch() throws Exception {
        FlowRunGraph graph = FlowRunGraph.from(json("""
            {"processes":[{"processId":"source"},{"processId":"target"}],"processIos":[],
             "connections":[{"connectionId":"edge","fromProcessId":"source","toProcessId":"target",
               "conditionExpr":"quantity >= 2 and attrs.grade = 'A'","capacity":3,"unit":"kg","failurePolicy":"retry"}]}
            """));
        assertEquals(List.of("source"), graph.roots());
        assertEquals("retry", graph.failurePolicy("edge"));
        assertEquals(List.of(), graph.routes("source", json("""
            {"quantity":1,"unit":"kg","attrs":{"grade":"A"}}
            """)));
        assertEquals(List.of(new FlowRunGraph.Decision("edge", "target", false)),
            graph.preview("source", json("""
                {"quantity":1,"unit":"kg","attrs":{"grade":"A"}}
                """)));
        assertEquals(List.of(new FlowRunGraph.Route("edge", "target")),
            graph.routes("source", json("""
                {"quantity":2,"unit":"kg","attrs":{"grade":"A"}}
                """)));
        assertEquals(List.of(new FlowRunGraph.Decision("edge", "target", true)),
            graph.preview("source", json("""
                {"quantity":2,"unit":"kg","attrs":{"grade":"A"}}
                """)));
        BusinessException overflow = assertThrows(BusinessException.class,
            () -> graph.routes("source", json("""
                {"quantity":4,"unit":"kg","attrs":{"grade":"A"}}
                """)));
        assertEquals(ErrorCode.CONFLICT, overflow.getErrorCode());
        assertEquals(ErrorCode.CONFLICT, assertThrows(BusinessException.class,
            () -> graph.routes("source", json("""
                {"quantity":2,"unit":"ea","attrs":{"grade":"A"}}
                """)))
            .getErrorCode());
    }

    @Test
    void cyclicRevisionCannotStart() throws Exception {
        JsonNode snapshot = json("""
            {"processes":[{"processId":"a"},{"processId":"b"}],"connections":[
              {"connectionId":"ab","fromProcessId":"a","toProcessId":"b"},
              {"connectionId":"ba","fromProcessId":"b","toProcessId":"a"}]}
            """);
        BusinessException failure = assertThrows(BusinessException.class, () -> FlowRunGraph.from(snapshot));
        assertEquals(ErrorCode.CONFLICT, failure.getErrorCode());
    }

    @Test
    void connectedPortValidationRulesApplyToRoutedOutput() throws Exception {
        FlowRunGraph graph = FlowRunGraph.from(json("""
            {"processes":[{"processId":"source"},{"processId":"target"}],
             "processIos":[
               {"processIoId":"out","processId":"source","direction":"output","unit":"kg","validationRule":"quantity >= 2",
                 "schemaJson":{"type":"object","properties":{"grade":{"type":"string"}},"required":["grade"]}},
               {"processIoId":"in","processId":"target","direction":"input","unit":"kg","validationRule":"attrs.grade = 'A'",
                 "schemaJson":{"type":"object","properties":{"grade":{"type":"string"}},"required":["grade"]}}],
             "connections":[{"connectionId":"edge","fromProcessId":"source","toProcessId":"target",
               "fromIoId":"out","toIoId":"in"}]}
            """));
        BusinessException low = assertThrows(BusinessException.class,
            () -> graph.routes("source", json("""
                {"quantity":1,"attrs":{"grade":"A"}}
                """)));
        assertEquals(ErrorCode.CONFLICT, low.getErrorCode());
        assertEquals("Port out validationRule did not pass.", low.getMessage());
        BusinessException wrongGrade = assertThrows(BusinessException.class,
            () -> graph.routes("source", json("""
                {"quantity":2,"attrs":{"grade":"B"}}
                """)));
        assertEquals("Port in validationRule did not pass.", wrongGrade.getMessage());
        BusinessException missing = assertThrows(BusinessException.class,
            () -> graph.routes("source", json("{" + "\"quantity\":2}")));
        assertEquals("Port out requires outputSnapshot.attrs.grade.", missing.getMessage());
        BusinessException wrongType = assertThrows(BusinessException.class,
            () -> graph.routes("source", json("{" + "\"quantity\":2,\"attrs\":{\"grade\":1}}")));
        assertEquals("Port out outputSnapshot.attrs.grade must be string.", wrongType.getMessage());
        assertEquals(List.of(new FlowRunGraph.Route("edge", "target")),
            graph.routes("source", json("""
                {"quantity":2,"attrs":{"grade":"A"}}
                """)));
    }

    @Test
    void publishedConnectionsCannotBypassMissingOrWrongDirectionPorts() throws Exception {
        for (String ports : List.of("[]",
            "[{\"processIoId\":\"out\",\"processId\":\"target\",\"direction\":\"output\"}]",
            "[{\"processIoId\":\"out\",\"processId\":\"source\",\"direction\":\"input\"}]")) {
            JsonNode snapshot = json("""
                {"processes":[{"processId":"source"},{"processId":"target"}],
                 "processIos":%s,
                 "connections":[{"connectionId":"edge","fromProcessId":"source",
                   "toProcessId":"target","fromIoId":"out"}]}
                """.formatted(ports));
            BusinessException failure = assertThrows(BusinessException.class,
                () -> FlowRunGraph.from(snapshot));
            assertEquals(ErrorCode.CONFLICT, failure.getErrorCode());
            assertEquals("Published revision connection edge has an invalid fromIoId.", failure.getMessage());
        }
    }

    @Test
    void invalidHistoricalRevisionRulesAreReportedAsConflicts() throws Exception {
        String processes = "[{\"processId\":\"source\"},{\"processId\":\"target\"}]";
        String plainEdge = "[{\"connectionId\":\"edge\",\"fromProcessId\":\"source\","
            + "\"toProcessId\":\"target\"}]";
        assertInvalidPublished("{\"processes\":" + processes + ",\"processIos\":{},"
            + "\"connections\":" + plainEdge + "}",
            "Published revision has invalid processIos.");
        assertInvalidPublished("{\"processes\":" + processes + ",\"processIos\":[{"
            + "\"processIoId\":\"out\",\"processId\":\"source\",\"direction\":\"output\","
            + "\"validationRule\":\"quantity == 2\"}],\"connections\":" + plainEdge + "}",
            "Published revision has invalid port out validationRule.");
        assertInvalidPublished("{\"processes\":" + processes + ",\"processIos\":[{"
            + "\"processIoId\":\"out\",\"processId\":\"source\",\"direction\":\"output\","
            + "\"schemaJson\":{\"type\":\"array\"}}],\"connections\":" + plainEdge + "}",
            "Published revision port out has invalid schemaJson.");
        assertInvalidPublished("{\"processes\":" + processes + ",\"connections\":[{"
            + "\"connectionId\":\"edge\",\"fromProcessId\":\"source\","
            + "\"toProcessId\":\"target\",\"conditionExpr\":\"quantity == 2\"}]}",
            "Published revision has invalid connection edge conditionExpr.");
    }

    private void assertInvalidPublished(String snapshot, String message) throws Exception {
        BusinessException failure = assertThrows(BusinessException.class,
            () -> FlowRunGraph.from(json(snapshot)));
        assertEquals(ErrorCode.CONFLICT, failure.getErrorCode());
        assertEquals(message, failure.getMessage());
    }

    private JsonNode json(String value) throws Exception {
        return mapper.readTree(value);
    }
}
