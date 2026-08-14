---
updated_at: 2026-08-14T15:47:33+09:00
author: Seoly
branch: main
head_commit: e536290
status: ready
detailed_log: ./history/2026-08/2026-08-14-1514-seoly-stability-and-align.md
---

# Current Baton — 지금 이어갈 작업

## 방금 완료한 작업

- 직전 바통이 요청한 회전 리사이즈, 커넥터 화살표, Ribbon Arrange·View 버튼 라이브 검증을 완료했다.
- Ribbon의 Align·Distribute가 legacy annotation에만 동작하던 것을 발견하고, 새 backend editor element에도 동작하도록 `WorkspaceEditorCommandApi`에 `alignSelected`/`distributeSelected`를 구현했다.
- "Select All"(리본 버튼·Ctrl/Cmd+A)이 워크플로 노드가 많을 때 앱을 크래시시키던 문제를 발견하고 근본 원인(Zustand `useWorkspaceStore()` 셀렉터 미사용 3곳)을 수정했다.
- Group/Ungroup을 라이브로 검증했다.
- 백엔드 jsonb 컬럼 33개를 전수 점검해, 이전에 고친 3개 외 같은 버그를 가진 필드 4개(`CanvasAnnotation.pointsJson/styleJson`, `FlowRule.actionConfig`, `RunStateSnapshot.snapshotData`)를 추가로 발견해 수정했다.
- `FlowRule.actionConfig` 수정은 `POST /flow-rules` 직접 호출로 **라이브 검증 완료**(200 OK, 중첩 JSON 왕복 확인).
- `RunStateSnapshot` 검증을 준비하다 **별개의 버그**를 발견했다 — `production_run` 테이블에 `deleted_yn` 컬럼이 아예 없어 조회·생성 둘 다 500 에러. `CreatedUpdatedAuditEntity` 상속 엔티티 15개를 전수 대조해 `production_run`만 이 컬럼이 빠졌음을 확인하고 `V13__production_run_deleted_yn.sql`을 추가했다. **재시작 후 적용 확인은 아직 안 됨.**
- STOMP 실시간 동기화 코드 경로를 리뷰했다 (라이브 2세션 테스트는 아직 없음).

상세 근거: [`2026-08-14-1514-seoly-stability-and-align.md`](./history/2026-08/2026-08-14-1514-seoly-stability-and-align.md)

## 현재 상태

- `main`은 `e536290`에 있다. 이번 교대의 변경은 전부 **미커밋** 상태다 — 저장소 소유자가 직접 커밋·push할 예정이다.
- 작업 트리는 dirty. 대상 파일 목록은 상세 기록의 "작업 트리 상태" 절 참고.
- **알려진 blocker**: `V13` 마이그레이션이 아직 적용 안 됨 — STS 재시작 전에 이 교대를 마감했다. 재시작하기 전까지 `production_run`/`run_state_snapshot` 관련 기능은 계속 500 에러가 난다.

## 다음 사람이 먼저 할 일

1. STS에서 Project → Clean 후 재시작해 `V13`을 적용하고, `GET /production-runs`가 더 이상 500을 내지 않는지 확인한다.
2. `POST /production-runs/start` → `POST /run-state-snapshots`로 `RunStateSnapshot.snapshotData` jsonb 수정을 라이브 검증한다.
3. 미커밋 변경을 기능 단위로 커밋한다 (상세 기록의 "다음 작업" 5번 참고).

## 확인이 필요한 부분

- Align/Distribute 라우팅이 legacy annotation과 backend editor element가 섞여 선택된 경우의 우선순위 — 현재는 새 엔진 쪽 선택 개수만 본다.
- `useWorkspaceStore()`를 셀렉터 없이 호출하는 곳이 이번에 고친 3개 파일 외에 더 있을 가능성 (전수 검색은 리터럴 `useWorkspaceStore()` 기준으로만 했다).
- 커넥터는 여전히 신규 backend editor element끼리만 연결되며 legacy annotation 도형에는 연결되지 않는다 (의도된 범위).

## 검증 결과

- frontend build / `tsc --noEmit` / lint / unit test(87) 전부 통과.
- backend `compileJava` 통과, 관련 단위 테스트(`FlowRule`/`RunStateSnapshot`/`CanvasAnnotation`) 통과.
- 회전 리사이즈, 화살표, Duplicate/Delete/Front/Back/Fit View, Align/Distribute, Group/Ungroup, Select All(21개 노드) 전부 브라우저에서 라이브 확인.
- `FlowRule.actionConfig`는 API 직접 호출로 라이브 확인. `CanvasAnnotation`/`RunStateSnapshot`은 컴파일·단위 테스트로만 검증했고 라이브 재현은 못 했다(`RunStateSnapshot`은 `V13` 미적용으로 인한 선행 blocker 때문).

## 작업 트리 상태

- 상태: dirty
- 파일 목록: 상세 기록([`2026-08-14-1514-seoly-stability-and-align.md`](./history/2026-08/2026-08-14-1514-seoly-stability-and-align.md))의 "작업 트리 상태" 절 참고 (V13 마이그레이션 포함)
- 기준 commit: `e536290` (이 위에 미커밋 변경이 쌓여 있음)
