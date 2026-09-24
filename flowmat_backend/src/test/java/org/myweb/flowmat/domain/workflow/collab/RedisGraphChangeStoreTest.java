package org.myweb.flowmat.domain.workflow.collab;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage;
import org.myweb.flowmat.domain.workflow.collab.dto.GraphChangeMessage.Type;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

class RedisGraphChangeStoreTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final ZSetOperations<String, String> sorted = mock(ZSetOperations.class);
    private final HashOperations<String, Object, Object> hashes = mock(HashOperations.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private RedisGraphChangeStore store;

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(values);
        when(redis.opsForZSet()).thenReturn(sorted);
        store = new RedisGraphChangeStore(redis, mapper, new WorkflowCollabProperties());
    }

    @Test
    void missingFirstChangeRequiresSnapshotEvenWhenSinceSeqIsZero() {
        when(values.get("ws:graph:seq:wf-1")).thenReturn("3");
        when(sorted.range("ws:graph:by-seq:wf-1", 0, 0)).thenReturn(Set.of("2"));

        assertTrue(store.getChangesSince("wf-1", 0).resetRequired());
    }

    @Test
    void missingMiddleChangeRequiresSnapshot() throws Exception {
        when(values.get("ws:graph:seq:wf-1")).thenReturn("3");
        when(sorted.range("ws:graph:by-seq:wf-1", 0, 0)).thenReturn(Set.of("1"));
        when(sorted.rangeByScore("ws:graph:by-seq:wf-1", 1.0, Double.POSITIVE_INFINITY))
            .thenReturn(new LinkedHashSet<>(List.of("1", "3")));
        when(redis.opsForHash()).thenReturn(hashes);
        when(hashes.multiGet("ws:graph:data:wf-1", List.of("1", "3"))).thenReturn(List.of(
            mapper.writeValueAsString(GraphChangeMessage.of(1, Type.NODE_CREATED, "wf-1", "n-1", "u-1", 1, null)),
            mapper.writeValueAsString(GraphChangeMessage.of(3, Type.NODE_DELETED, "wf-1", "n-1", "u-1", 3, null))
        ));

        assertTrue(store.getChangesSince("wf-1", 0).resetRequired());
    }

    @Test
    void upToDateCursorNeedsNoReset() {
        when(values.get("ws:graph:seq:wf-1")).thenReturn("3");
        when(sorted.range("ws:graph:by-seq:wf-1", 0, 0)).thenReturn(Set.of("2"));

        assertFalse(store.getChangesSince("wf-1", 3).resetRequired());
        assertTrue(store.getChangesSince("wf-1", 4).resetRequired());
    }

    @Test
    void emptyIndexTailRequiresSnapshot() {
        when(values.get("ws:graph:seq:wf-1")).thenReturn("3");
        when(sorted.range("ws:graph:by-seq:wf-1", 0, 0)).thenReturn(Set.of("1"));
        when(sorted.rangeByScore("ws:graph:by-seq:wf-1", 3.0, Double.POSITIVE_INFINITY))
            .thenReturn(Set.of());

        assertTrue(store.getChangesSince("wf-1", 2).resetRequired());
    }
}
