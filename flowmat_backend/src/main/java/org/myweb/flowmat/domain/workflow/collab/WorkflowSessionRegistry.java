package org.myweb.flowmat.domain.workflow.collab;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * WebSocket 세션(sessionId) → (userId, workflowId) 인메모리 매핑.
 * 단일 인스턴스 배포 전제 — 멀티 인스턴스 확장 시 Redis 로 이전 필요.
 */
@Component
public class WorkflowSessionRegistry {

    private record SessionInfo(String userId, String workflowId) {}

    private final ConcurrentHashMap<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    public void register(String sessionId, String userId, String workflowId) {
        sessions.put(sessionId, new SessionInfo(userId, workflowId));
    }

    public String resolveUserId(String sessionId) {
        SessionInfo info = sessions.get(sessionId);
        return info != null ? info.userId() : null;
    }

    public String resolveWorkflowId(String sessionId) {
        SessionInfo info = sessions.get(sessionId);
        return info != null ? info.workflowId() : null;
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }
}
