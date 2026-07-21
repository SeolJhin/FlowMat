package org.myweb.flowmat.domain.workflow.collab;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkflowSessionRegistry {

    private static final String KEY_PREFIX = "ws:session:";
    private static final String FIELD_USER = "userId";
    private static final String FIELD_WORKFLOW = "workflowId";
    private static final long SESSION_TTL_HOURS = 24L;

    private final StringRedisTemplate redisTemplate;

    public void register(String sessionId, String userId, String workflowId) {
        String key = key(sessionId);
        redisTemplate.opsForHash().put(key, FIELD_USER, userId);
        redisTemplate.opsForHash().put(key, FIELD_WORKFLOW, workflowId);
        redisTemplate.expire(key, SESSION_TTL_HOURS, TimeUnit.HOURS);
    }

    public String resolveUserId(String sessionId) {
        Object val = redisTemplate.opsForHash().get(key(sessionId), FIELD_USER);
        return val != null ? val.toString() : null;
    }

    public String resolveWorkflowId(String sessionId) {
        Object val = redisTemplate.opsForHash().get(key(sessionId), FIELD_WORKFLOW);
        return val != null ? val.toString() : null;
    }

    public void remove(String sessionId) {
        redisTemplate.delete(key(sessionId));
    }

    private static String key(String sessionId) {
        return KEY_PREFIX + sessionId;
    }
}
