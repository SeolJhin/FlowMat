package org.myweb.flowmat.domain.workflow.collab.dto;

/**
 * 협업 presence 브로드캐스트 메시지.
 * type 에 따라 cursorX/Y, editingProcessId 사용 여부가 달라진다.
 * timestamp 는 서버에서 항상 재설정한다.
 */
public record PresenceMessage(
    Type type,
    String userId,
    String workflowId,
    Double cursorX,
    Double cursorY,
    String editingProcessId,
    long timestamp
) {
    public enum Type {
        JOIN,
        LEAVE,
        CURSOR_MOVED,
        NODE_EDITING
    }

    public static PresenceMessage join(String userId, String workflowId) {
        return new PresenceMessage(Type.JOIN, userId, workflowId, null, null, null,
            System.currentTimeMillis());
    }

    public static PresenceMessage leave(String userId, String workflowId) {
        return new PresenceMessage(Type.LEAVE, userId, workflowId, null, null, null,
            System.currentTimeMillis());
    }

    public PresenceMessage withServerValues(String userId, String workflowId) {
        return new PresenceMessage(type, userId, workflowId, cursorX, cursorY, editingProcessId,
            System.currentTimeMillis());
    }
}
