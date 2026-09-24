# A. 협업 방어층

**한 줄 결론:** 직접 핸들러 호출 권한, presence 입력, 삭제 이벤트, 커밋 뒤 알림, 재접속 시퀀스의 주요 빈틈을 보완했다.

## 한 것 / 못 한 것

| 항목 | 결과 |
|---|---|
| A1 | `NodeSyncController`의 드래그 relay도 workflow 쓰기 권한으로 검증. presence는 읽기 권한 유지. 직접 호출 비회원 거부 테스트 추가. |
| A2 | clientId 필수·길이, cursor 유한성/범위, annotation 유형·points 개수/좌표·크기 검증. malformed 입력 테스트 추가. |
| A3 | 백엔드 삭제 이벤트 null payload 발행 테스트, 프론트의 annotation·node·connection `entityId` 삭제 테스트 통과. |
| A4 | 기존 `GraphSyncService`의 `afterCommit` 동작을 커밋/롤백 단위 테스트로 확인. 롤백 시 저장·발행 없음. |
| A5 | 캔버스 DB 조회 **전** Redis 시퀀스를 캡처하도록 변경. STOMP 구독 등록 **후** 매 연결에서 graph change 복구 호출. Redis 보관 구간의 처음/중간/끝 누락과 미래 시퀀스는 snapshot 재조회 신호로 처리. |
| A6 | 기존 문서 저장 흐름을 읽고 점검했다. 아래 표 참고. |

집중 백엔드 테스트와 백엔드 전체 315건, 프론트 전체 typecheck·lint·Vitest 176건·build 통과. 실제 다중 브라우저에서 재접속·동시 편집을 반복하는 검증은 하지 않았다.

## A5 재접속 검증 절차

1. 클라이언트가 `GET /workflows/{id}/canvas`의 `graphSeq=S`를 받는다.
2. STOMP graph topic 구독 뒤 `GET /workflows/{id}/graph-changes?sinceSeq=S`를 호출한다. 반환 이벤트를 순서대로 반영한다.
3. `resetRequired=true`이면 canvas를 재조회한다. 서버가 더는 연속 이벤트를 보장하지 않을 때 UI가 과거 상태를 고정하지 않는다.
4. 네트워크를 끊은 동안 다른 클라이언트가 노드/연결을 삭제하고 재접속한다. 최종 canvas와 새로 연 브라우저가 같아야 한다. 이 실브라우저 단계는 D6에 넘긴다.

## A6 저장 점검표

| 단계 | 관찰 |
|---|---|
| 권한 | `requireWorkflowWriteAccess` 사용 |
| 기존 문서 행 잠금 | `WorkflowEditorDocumentRepository.findById`의 `PESSIMISTIC_WRITE` |
| 버전 충돌 | `expectedVersion` 불일치 시 `BusinessException(CONFLICT)`; HTTP 409 경로 |
| 저장/증가 | 문서·요소 저장 전 `version+1`, 트랜잭션 내 저장 |
| 알림 | `GraphSyncService.broadcast`가 활성 트랜잭션에서 `afterCommit` 등록 |

**남은 위험:** 처음 저장할 때 행이 아직 없으면 `findById`가 잠글 행이 없다. 동시 첫 저장은 PK 충돌이나 기대와 다른 응답이 가능하다. 전체 문서 저장 모델은 유지했으며, DB 잠금 또는 원자적 삽입 방안은 협업 모델 결정 뒤 설계가 필요하다. Redis 이벤트 기록과 STOMP 전송은 DB 트랜잭션 밖이므로, 커밋 직후 Redis 장애가 나면 알림 누락 가능성이 있다. 이벤트가 Redis에 아예 기록되지 않고 시퀀스도 늘지 않으면 변경 로그 재조회만으로는 감지할 수 없다. 주기적 snapshot 대조 또는 DB outbox가 필요한지 결정해야 한다.

## 사람 결정이 필요한 것

- D1 협업 충돌 모델, D5 STOMP 독립 보안 검토, D6 실제 다중 사용자 검증.

## 다른 담당에게 넘길 것

- **협업 설계 담당:** 첫 문서 동시 생성 정책과 commit 이후 Redis 장애 복구 보장을 결정한다.
