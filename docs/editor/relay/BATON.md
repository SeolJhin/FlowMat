---
updated_at: 2026-08-16T18:06:10+09:00
author: Seoly
branch: main
head_commit: c13040a
status: ready
detailed_log: ./history/2026-08/2026-08-16-1806-seoly-jsonb-verification.md
---

# Current Baton — 지금 이어갈 작업

## 방금 완료한 작업

- 직전 바통이 재시작 전에 마감하며 남긴 검증을 마무리했다.
- `V13__production_run_deleted_yn.sql`이 재시작 후 정상 적용된 것을 확인했다 (`GET /production-runs` 200 OK, 이전엔 500).
- `RunStateSnapshot.snapshotData`와 `CanvasAnnotation.pointsJson`/`styleJson`을 API 직접 호출로 라이브 검증했다 — 둘 다 중첩 JSON이 정상 왕복됨.
- 이로써 이번 jsonb 감사에서 발견한 4개 필드(`FlowRule.actionConfig`, `RunStateSnapshot.snapshotData`, `CanvasAnnotation.pointsJson`/`styleJson`) 전부 라이브 검증이 끝났다. `production_run` 기능(조회·생성)도 정상 복구됐다.

상세 근거: [`2026-08-16-1806-seoly-jsonb-verification.md`](./history/2026-08/2026-08-16-1806-seoly-jsonb-verification.md)

## 현재 상태

- `main`은 `c13040a`에 있고 `origin/main`과 일치한다. 5개 커밋(`49bd86d`~`c13040a`) 전부 push 완료.
- 작업 트리는 clean.
- 알려진 blocker는 없다.

## 다음 사람이 먼저 할 일

1. 이번 검증 과정에서 만든 테스트 데이터(production run 1건, run state snapshot 1건, canvas annotation 1건 — 전부 `jsonb-audit-test-*` 표시)를 정리한다.
2. 두 브라우저 세션을 열어 커넥터 바인딩의 STOMP 실시간 동기화를 직접 확인한다 (계속 이월된 항목).
3. 이 문서를 커밋·push한다 (`docs(relay): ...` 형식).

## 확인이 필요한 부분

- Align/Distribute 라우팅이 legacy annotation과 backend editor element가 섞여 선택된 경우의 우선순위 — 현재는 새 엔진 쪽 선택 개수만 본다.
- `useWorkspaceStore()`를 셀렉터 없이 호출하는 곳이 이미 고친 3개 파일 외에 더 있을 가능성 (전수 검색은 리터럴 `useWorkspaceStore()` 기준으로만 했다).
- 커넥터는 여전히 신규 backend editor element끼리만 연결되며 legacy annotation 도형에는 연결되지 않는다 (의도된 범위).
- `CreatedUpdatedAuditEntity`/`SoftDeleteEntity` 상속 엔티티의 `deleted_yn` 커버리지는 이번에 15개 전부 확인해 `production_run` 외에는 문제없었지만, 향후 새 엔티티 추가 시 같은 실수가 재발할 수 있다 — 체크리스트화를 고려할 만하다.

## 검증 결과

- frontend build / `tsc --noEmit` / lint / unit test(87) 전부 통과.
- backend `compileJava` 통과, 관련 단위 테스트(`FlowRule`/`RunStateSnapshot`/`CanvasAnnotation`) 통과.
- 회전 리사이즈, 화살표, Duplicate/Delete/Front/Back/Fit View, Align/Distribute, Group/Ungroup, Select All(21개 노드) 전부 브라우저에서 라이브 확인.
- jsonb 수정 4건(`FlowRule`/`RunStateSnapshot`/`CanvasAnnotation`×2) 전부 API 직접 호출로 라이브 확인 완료.
- `production_run` 조회·생성 라이브 확인 완료.

## 작업 트리 상태

- 상태: clean
- 미커밋 파일: 본 문서(`BATON.md`)와 새 relay 기록만
- 기준 commit: `c13040a`
