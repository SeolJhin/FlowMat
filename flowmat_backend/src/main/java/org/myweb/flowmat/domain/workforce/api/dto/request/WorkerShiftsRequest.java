package org.myweb.flowmat.domain.workforce.api.dto.request;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import java.io.IOException;
import java.util.List;

/** A worker's weekly shifts, all at once (docs/domain/worker-calendar.md WC2); an empty list clears them. */
public record WorkerShiftsRequest(List<Shift> shifts) {

    /** @param workDays ISO days of the week the shift starts on, 1 (Monday) to 7 (Sunday) */
    public record Shift(String shiftStart, String shiftEnd,
                        @JsonDeserialize(contentUsing = WholeWeekday.class) List<Integer> workDays) {
    }

    /** Read each weekday exactly; the service still checks the ISO range and missing values. */
    public static final class WholeWeekday extends StdDeserializer<Integer> {
        private static final String MESSAGE = "workDays are ISO days of the week, 1 (Monday) to 7 (Sunday).";

        public WholeWeekday() {
            super(Integer.class);
        }

        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (!parser.currentToken().isNumeric()) {
                throw JsonMappingException.from(parser, MESSAGE);
            }
            try {
                return parser.getDecimalValue().intValueExact();
            } catch (ArithmeticException invalid) {
                throw JsonMappingException.from(parser, MESSAGE, invalid);
            }
        }
    }
}
