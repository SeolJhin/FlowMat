package org.myweb.flowmat;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
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

/** Equipment calendars, downtime and the equipment check in work order readiness (docs/domain/equipment-schedule.md). */
@AutoConfigureMockMvc
class EquipmentScheduleIntegrationTest extends IntegrationTestSupport {

    // 2030-01-07 is a Monday; the planning zone defaults to Asia/Seoul (+09:00).
    private static final String MONDAY = "2030-01-07T00:00:00+09:00";
    private static final String NEXT_MONDAY = "2030-01-14T00:00:00+09:00";

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtProvider jwtProvider;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void aCalendarAndDowntimeSetHowMuchTimeTheEquipmentHas() throws Exception {
        String mixer = equipment("MIX-" + tag(), 10);

        // Without a calendar the whole window is working time.
        availability(mixer, "2030-01-07T08:00:00+09:00", "2030-01-07T18:00:00+09:00")
            .andExpect(jsonPath("$.data.calendarSet").value(false))
            .andExpect(jsonPath("$.data.availableHours").value(10))
            .andExpect(jsonPath("$.data.capacity").value(100));

        call(put("/equipments/" + mixer + "/calendar"), json(calendar("09:00", "17:00", 5, 1, 2, 3, 4, 4)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.timeZone").value("Asia/Seoul"))
            .andExpect(jsonPath("$.data.calendar.workDays.length()").value(5))
            .andExpect(jsonPath("$.data.calendar.workDays[0]").value(1))
            .andExpect(jsonPath("$.data.calendar.shiftHours").value(8));
        availability(mixer, MONDAY, NEXT_MONDAY)
            .andExpect(jsonPath("$.data.calendarSet").value(true))
            .andExpect(jsonPath("$.data.workingHours").value(40))
            .andExpect(jsonPath("$.data.availableHours").value(40));

        // Down Tuesday 12:00-20:00: only 12:00-17:00 was working time.
        JsonNode schedule = data(call(post("/equipments/" + mixer + "/downtimes"), json(Map.of("downtimeType", "maintenance",
            "startsAt", "2030-01-08T12:00:00+09:00", "endsAt", "2030-01-08T20:00:00+09:00", "reason", "Belt change")))
            .andExpect(jsonPath("$.data.downtimes[0].hours").value(8))
            .andExpect(jsonPath("$.data.downtimes[0].reason").value("Belt change")));
        availability(mixer, MONDAY, NEXT_MONDAY)
            .andExpect(jsonPath("$.data.workingHours").value(40))
            .andExpect(jsonPath("$.data.downtimeHours").value(5))
            .andExpect(jsonPath("$.data.availableHours").value(35))
            .andExpect(jsonPath("$.data.capacity").value(350));

        // A night shift runs past midnight into the next day's window.
        call(put("/equipments/" + mixer + "/calendar"), json(calendar("22:00", "06:00", 1)))
            .andExpect(jsonPath("$.data.calendar.shiftHours").value(8));
        availability(mixer, MONDAY, "2030-01-08T12:00:00+09:00").andExpect(jsonPath("$.data.availableHours").value(8));
        availability(mixer, "2030-01-08T00:00:00+09:00", "2030-01-08T12:00:00+09:00")
            .andExpect(jsonPath("$.data.availableHours").value(6));

        call(put("/equipments/" + mixer + "/calendar"), json(calendar("25:00", "06:00", 1))).andExpect(status().isBadRequest());
        call(put("/equipments/" + mixer + "/calendar"), json(calendar("08:00", "17:00"))).andExpect(status().isBadRequest());
        call(put("/equipments/" + mixer + "/calendar"), json(calendar("08:00", "17:00", 8))).andExpect(status().isBadRequest());
        call(post("/equipments/" + mixer + "/downtimes"), json(Map.of("startsAt", "2030-01-08T12:00:00+09:00",
            "endsAt", "2030-01-08T11:00:00+09:00"))).andExpect(status().isBadRequest());
        call(post("/equipments/" + mixer + "/downtimes"), json(Map.of("downtimeType", "coffee",
            "startsAt", "2030-01-08T12:00:00+09:00", "endsAt", "2030-01-08T13:00:00+09:00"))).andExpect(status().isBadRequest());
        availability(mixer, NEXT_MONDAY, MONDAY).andExpect(status().isBadRequest());
        availability(mixer, MONDAY, "2031-03-01T00:00:00+09:00").andExpect(status().isBadRequest());
        availability(mixer, "monday", NEXT_MONDAY)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("with an offset")));
        callAs("unrelated-user", get("/equipments/" + mixer + "/schedule")).andExpect(status().isForbidden());
        callAs("unrelated-user", put("/equipments/" + mixer + "/calendar").contentType(MediaType.APPLICATION_JSON)
            .content(json(calendar("08:00", "17:00", 1)))).andExpect(status().isForbidden());

        String downtimeId = schedule.path("downtimes").get(0).path("downtimeId").asText();
        call(delete("/equipments/" + mixer + "/downtimes/" + downtimeId))
            .andExpect(jsonPath("$.data.downtimes.length()").value(0));
        call(delete("/equipments/" + mixer + "/downtimes/" + downtimeId)).andExpect(status().isNotFound());
        call(delete("/equipments/" + mixer + "/calendar")).andExpect(jsonPath("$.data.calendar").isEmpty());
        availability(mixer, MONDAY, NEXT_MONDAY).andExpect(jsonPath("$.data.availableHours").value(168));
    }

    @Test
    void readinessChecksWhetherTheAssignedEquipmentHasTheTime() throws Exception {
        String tag = tag();
        String oven = equipment("OVEN-" + tag, 10);
        call(put("/equipments/" + oven + "/calendar"), json(calendar("09:00", "17:00", 1, 2, 3, 4, 5))).andExpect(status().isOk());
        // 100 to make at 10 an hour needs 10 h; Monday 09:00 to Tuesday 17:00 has two 8 h shifts.
        String order = workOrder("Bake " + tag, "2030-01-07T09:00:00+09:00", "2030-01-08T17:00:00+09:00");
        readiness(order).andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')]").isEmpty());

        call(put("/work-orders/" + order + "/equipment"), json(Map.of("equipmentId", oven)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.equipmentId").value(oven));
        readiness(order)
            .andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')].status").value(hasItem("ok")))
            .andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')].message")
                .value(hasItem(containsString("needs 10 h of the 16 h available in the planned window"))));

        // Down all Tuesday: 8 h left for 10 h of work.
        call(post("/equipments/" + oven + "/downtimes"), json(Map.of("downtimeType", "breakdown",
            "startsAt", "2030-01-08T00:00:00+09:00", "endsAt", "2030-01-09T00:00:00+09:00"))).andExpect(status().isOk());
        readiness(order)
            .andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')].status").value(hasItem("warn")))
            .andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')].message")
                .value(hasItem(containsString("needs 10 h for 100 but has only 8 h available in the planned window (8 h down)"))));

        // Another approved order on the same oven at the same time is called out.
        String other = workOrder("Other " + tag, "2030-01-08T09:00:00+09:00", "2030-01-09T17:00:00+09:00");
        call(put("/work-orders/" + other + "/equipment"), json(Map.of("equipmentId", oven))).andExpect(status().isOk());
        readiness(order).andExpect(jsonPath("$.data.checks[?(@.code == 'schedule')]").isEmpty());
        String otherNumber = data(call(post("/work-orders/" + other + "/approve"))).path("workOrderNumber").asText();
        readiness(order)
            .andExpect(jsonPath("$.data.checks[?(@.code == 'schedule')].status").value(hasItem("warn")))
            .andExpect(jsonPath("$.data.checks[?(@.code == 'schedule')].message").value(hasItem(containsString(otherNumber))));

        call(put("/equipments/" + oven), json(Map.of("equipmentStatus", "maintenance"))).andExpect(status().isOk());
        readiness(order)
            .andExpect(jsonPath("$.data.ready").value(false))
            .andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')].message").value(hasItem(containsString("under maintenance"))));

        Map<String, Object> none = new HashMap<>();
        none.put("equipmentId", null);
        call(put("/work-orders/" + order + "/equipment"), json(none)).andExpect(jsonPath("$.data.equipmentId").isEmpty());
        readiness(order).andExpect(jsonPath("$.data.checks[?(@.code == 'equipment')]").isEmpty());

        String retired = equipment("OLD-" + tag, 5);
        call(put("/equipments/" + retired), json(Map.of("equipmentStatus", "inactive"))).andExpect(status().isOk());
        call(put("/work-orders/" + order + "/equipment"), json(Map.of("equipmentId", retired))).andExpect(status().isConflict());
        call(put("/work-orders/" + order + "/equipment"), json(Map.of("equipmentId", "no-such-equipment")))
            .andExpect(status().isBadRequest());
        call(post("/work-orders/" + other + "/cancel")).andExpect(status().isOk());
        call(put("/work-orders/" + other + "/equipment"), json(Map.of("equipmentId", oven))).andExpect(status().isConflict());
        callAs("unrelated-user", put("/work-orders/" + order + "/equipment").contentType(MediaType.APPLICATION_JSON)
            .content(json(Map.of("equipmentId", oven)))).andExpect(status().isForbidden());
    }

    private String equipment(String code, int capacityPerHour) throws Exception {
        return id(call(post("/equipments"), json(Map.of("projectId", DEMO_PROJECT, "equipmentCode", code,
            "equipmentName", code.toLowerCase(), "equipmentType", "machine",
            "details", Map.of("capacityPerHour", capacityPerHour)))), "equipmentId");
    }

    private String workOrder(String title, String start, String end) throws Exception {
        return id(call(post("/work-orders"), json(Map.of("projectId", DEMO_PROJECT, "workOrderTitle", title,
            "workflowId", DEMO_WORKFLOW, "targetQuantity", 100, "plannedStartAt", start, "plannedEndAt", end))), "workOrderId");
    }

    private static Map<String, Object> calendar(String start, String end, Integer... days) {
        return Map.of("shiftStart", start, "shiftEnd", end, "workDays", List.of(days));
    }

    private ResultActions availability(String equipmentId, String from, String to) throws Exception {
        return call(get("/equipments/" + equipmentId + "/availability").param("from", from).param("to", to));
    }

    private ResultActions readiness(String workOrderId) throws Exception {
        return call(get("/work-orders/" + workOrderId + "/readiness")).andExpect(status().isOk());
    }

    private static String tag() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private JsonNode data(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data");
    }

    private String id(ResultActions result, String field) throws Exception {
        return data(result).path(field).asText();
    }

    private ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return callAs(DEMO_OWNER, request);
    }

    private ResultActions callAs(String userId, MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request.header("Authorization", "Bearer " + jwtProvider.generateAccessToken(userId)));
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String body) throws Exception {
        return call(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
