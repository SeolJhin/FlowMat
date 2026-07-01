package org.myweb.flowmat.domain.workflow.domain.enums;

import java.util.Arrays;
import java.util.Locale;

public enum NodeType {
    PROCESS,
    EQUIPMENT,
    STORAGE,
    INPUT,
    OUTPUT;

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return PROCESS.name().toLowerCase(Locale.ROOT);
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);

        if ("DECISION".equals(normalized)) {
            return OUTPUT.name().toLowerCase(Locale.ROOT);
        }

        return Arrays.stream(values())
            .filter(nodeType -> nodeType.name().equals(normalized))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unsupported nodeType: " + value))
            .name()
            .toLowerCase(Locale.ROOT);
    }
}
