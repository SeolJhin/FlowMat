---
updated_at: 2026-08-16T18:06:10+09:00
author: Seoly
branch: main
base_commit: c13040a
head_commit: c13040a
status: ready
topic: jsonb-verification
---

# Relay Leg — 2026-08-16 / Seoly / jsonb-verification

## 목표

- 직전 교대([`2026-08-14-1514-seoly-stability-and-align.md`](./2026-08-14-1514-seoly-stability-and-align.md))가 재시작 전에 마감하며 남긴 검증 항목을 마무리한다: `V13` 마이그레이션 적용 확인, `RunStateSnapshot`/`CanvasAnnotation`의 jsonb 수정 라이브 재현.

## 완료한 작업

- 직전 교대의 커밋 5개(`49bd86d`~`c13040a`)가 전부 커밋·push된 상태임을 확인했다 (`git log origin/main..HEAD` 비어 있음).
- 백엔드·프론트엔드 재시작 후 `GET /production-runs?workflowId=wf_demo_main`이 200 OK로 응답하는 것을 확인했다 — `V13__production_run_deleted_yn.sql`이 정상 적용됨.
- `POST /production-runs/start`로 production run을 생성했다.
- `POST /run-state-snapshots`에 중첩 JSON(`{processes:[...], meta:{ok:true}}`)을 담아 저장했다 — 200 OK, 저장값 그대로 왕복 확인. `RunStateSnapshot.snapshotData` 수정 라이브 검증 완료.
- `POST /workflows/wf_demo_main/annotations`에 중첩 객체·배열이 섞인 `points`와 `style`을 담아 저장했다 — 200 OK, 저장값 그대로 왕복 확인. `CanvasAnnotation.pointsJson`/`styleJson` 수정 라이브 검증 완료.
- 이로써 이번 jsonb 감사에서 발견한 4개 필드(`FlowRule.actionConfig`, `RunStateSnapshot.snapshotData`, `CanvasAnnotation.pointsJson`/`styleJson`) 전부 라이브 검증이 끝났다.

## 주요 변경 파일

- 없음. 이 교대는 검증만 수행했고 코드 변경은 없다.

## 커밋

- 없음.

## 결정 사항과 이유

- 프론트엔드에 생성 화면이 없는 리소스(FlowRule, ProductionRun, RunStateSnapshot, CanvasAnnotation 일부 경로)는 브라우저 콘솔에서 `localStorage.access_token`을 읽어 백엔드 REST API를 직접 `fetch`로 호출하는 방식으로 검증했다. UI가 없다는 이유로 검증을 미루는 대신, 실제 Hibernate 저장 경로를 정확히 재현하는 것이 목적에 더 부합한다고 판단했다.

## 실행한 검증

| 검증 | 결과 |
|---|---|
| `GET /production-runs?workflowId=wf_demo_main` | PASS, 200 OK (V13 적용 전에는 500) |
| `POST /production-runs/start` | PASS, 200 OK |
| `POST /run-state-snapshots` (중첩 JSON) | PASS, 200 OK, 저장값 왕복 확인 |
| `POST /workflows/wf_demo_main/annotations` (중첩 points/style) | PASS, 200 OK, 저장값 왕복 확인 |

## 실행하지 못한 검증

- 두 브라우저 세션 간 STOMP 실시간 동기화 — 여전히 미실시. 이번 교대는 jsonb 검증에 집중했다.

## 알려진 사항

- 이번 교대에서 테스트로 만든 데이터(production run 1건, run state snapshot 1건, canvas annotation 1건)를 정리하지 않았다. 전부 `jsonb-audit-test-*` 또는 임시 표시가 붙어 있어 식별 가능하다.
- 검증 도중 관련 없어 보이는 GitHub OAuth 인증 탭(`github.com/login/oauth/authorize`)이 브라우저에 나타났다 — 이 세션의 조작으로 연 것이 아니며, 원인은 확인하지 않았다.

## 다음 작업

1. 이번 교대에서 만든 테스트 데이터(production run/snapshot/annotation)를 정리한다.
2. 두 브라우저 세션으로 STOMP 실시간 동기화를 확인한다.
3. 프로젝트 전체 범위의 작업 목록 정리 — 별도로 진행 중 (이 문서와 무관하게 사용자 요청으로 작성됨).

## 검토받고 싶은 부분

- 없음.

## 작업 트리 상태

- 상태: clean (검증만 수행, 코드 변경 없음)
- 미커밋 파일: 본 문서 자체만 신규
- 원격 반영: 본 문서 커밋 후 push 필요

## 참고 자료

- [`../../BATON.md`](../../BATON.md)
- [`2026-08-14-1514-seoly-stability-and-align.md`](./2026-08-14-1514-seoly-stability-and-align.md) (직전 교대)
