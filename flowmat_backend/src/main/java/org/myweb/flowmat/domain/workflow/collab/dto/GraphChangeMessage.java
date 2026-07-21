package org.myweb.flowmat.domain.workflow.collab.dto;

public record GraphChangeMessage(
    String changeType,
    String workflowId,
    String entityId,
    String userId,
    long timestamp
) {
    public enum Type {
        NODE_CREATED, NODE_UPDATED, NODE_DELETED,
        CONNECTION_CREATED, CONNECTION_UPDATED, CONNECTION_DELETED,
        PORT_CREATED, PORT_UPDATED, PORT_DELETED
    }

    public static GraphChangeMessage of(Type type, String workflowId, String entityId, String userId) {
        return new GraphChangeMessage(type.name(), workflowId, entityId, userId, System.currentTimeMillis());
    }
}
