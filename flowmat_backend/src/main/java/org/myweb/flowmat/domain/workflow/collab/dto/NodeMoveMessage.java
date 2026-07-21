package org.myweb.flowmat.domain.workflow.collab.dto;

/**
 * 노드 드래그 "도중" 실시간 위치 릴레이 메시지. 영속화하지 않는 순수 브로드캐스트 페이로드.
 * 최종 위치 저장은 REST PUT /api/processes/{id} 가 담당한다.
 * userId/workflowId/timestamp 는 서버가 항상 재설정한다.
 */
public record NodeMoveMessage(
    String processId,
    double x,
    double y,
    String userId,
    String workflowId,
    long timestamp
) {
    public NodeMoveMessage withServerValues(String userId, String workflowId) {
        return new NodeMoveMessage(processId, x, y, userId, workflowId, System.currentTimeMillis());
    }
}
