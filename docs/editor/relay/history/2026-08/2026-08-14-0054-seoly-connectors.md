---
updated_at: 2026-08-14T00:54:20+09:00
author: Seoly
branch: main
base_commit: 54da9a8
head_commit: bc3fe0a
status: ready
topic: connectors
---

# Relay Leg — 2026-08-14 / Seoly / connectors

## 목표

- FlowMat 독립 에디터에 도형 앵커 기반 커넥터를 추가한다.
- 저장·복원 후에도 커넥터가 앵커 도형을 계속 추종하게 한다.
- 회전 리사이즈, 화살표 렌더링, Ribbon 명령을 함께 완성한다.
- 라이브 검증 과정에서 드러난 기존 저장·렌더 루프 결함을 수정한다.

## 완료한 작업

- `LineElement`에 `startBinding`과 `endBinding` 모델을 추가했다.
- 회전을 고려한 앵커 계산과 가장 가까운 앵커 탐색을 구현했다.
- 도형 이동·리사이즈·회전 후 바인딩된 선의 끝점을 다시 계산하도록 연결했다.
- 앵커 도형 삭제 시 커넥터를 삭제하지 않고 해당 바인딩만 해제하도록 했다.
- 드래그로 두 앵커를 연결하는 workspace connector tool을 추가했다.
- 로컬 serializer와 backend adapter에서 커넥터 바인딩을 왕복 보존하도록 했다.
- Hibernate의 editor document JSON 필드를 PostgreSQL `jsonb`로 명시적으로 매핑했다.
- 회전된 단일 도형의 리사이즈와 회전된 selection handle을 보정했다.
- 커넥터 화살표 marker와 anchor overlay를 SVG 편집 표면에 추가했다.
- Arrange, Align, Navigation 명령을 Ribbon에 연결했다.
- editor document 조회 pending 상태에서 발생하던 선택 정리 무한 업데이트를 차단했다.
- 소스 파일에 남아 있던 UTF-8 BOM을 별도 커밋으로 정리했다.

## 주요 커밋

- `6b978c5`: `fix(backend): map editor document jsonb columns with JdbcTypeCode`
- `b4ac67f`: `feat(editor): add connector line data model and anchor geometry`
- `55c077b`: `fix(editor): persist connector bindings through backend adapter`
- `90ee9a6`: `feat(editor): rotation-aware resize and connector arrowheads`
- `0e09538`: `feat(workspace): add connector drawing interaction`
- `a7560f2`: `feat(toolbar): wire arrange/align/navigation commands into ribbon`
- `0a5bd04`: `docs: log connector line session progress and remaining work`
- `bc3fe0a`: `chore: strip stray BOM from source files`

## 결정 사항과 이유

- 커넥터는 React Flow workflow edge가 아니라 독립 editor의 `LineElement`로 유지한다. 두 모델의 책임과 저장 경로가 다르기 때문이다.
- 앵커는 도형의 상·우·하·좌 네 지점으로 제한한다. 현재 UX에 필요한 최소 범위이며 회전 계산도 명확하다.
- 앵커 도형이 삭제되면 선 전체를 삭제하지 않고 해당 끝의 바인딩만 해제한다. 사용자의 선 자체는 보존하기 위해서다.
- legacy annotation에는 커넥터를 붙이지 않고 backend editor element끼리만 연결한다. 서로 다른 persistence 모델을 한 커넥터가 참조하는 복잡성을 피하기 위해서다.
- `Maximum update depth` 수정은 안정적인 빈 문서 참조와 state reference 보존을 함께 적용했다. 한쪽만 수정하면 동일한 형태의 반복 갱신이 재발할 수 있기 때문이다.

## 실행한 검증

직전 작업의 상세 기록인 [`connector-line-progress-2026-08-14.md`](../../../connector-line-progress-2026-08-14.md)를 기준으로 다음 결과가 보고되었다.

| 검증 | 결과 |
|---|---|
| frontend build | PASS |
| TypeScript `--noEmit` | PASS |
| frontend lint | PASS |
| frontend unit tests | PASS, 87 tests 기록 |
| backend Java compile | PASS |
| editor-document 저장 | PASS, PUT 200 확인 |
| 커넥터 저장 후 새로고침 | PASS |
| 앵커 도형 이동 시 커넥터 추종 | PASS, 사용자 수동 확인 |
| workspace cold load | PASS, update-depth 오류 재발 없음 |

이 릴레이 기록을 작성하는 과정에서는 위 검증을 다시 실행하지 않았다.

## 실행하지 못한 검증

- 회전 도형 리사이즈의 실제 화면 조작성은 단위 테스트만 있고 수동 시각 검증이 남아 있다.
- 커넥터 화살표의 방향과 회전·이동 후 표시를 브라우저에서 별도로 확인하지 않았다.
- Ribbon 신규 버튼 전체를 하나씩 누르는 수동 검증이 남아 있다.
- 두 브라우저 세션 사이의 커넥터 바인딩 동기화는 확인하지 않았다.

## 알려진 사항

- adapter 수정 전에 저장된 커넥터는 `startBinding`과 `endBinding`이 이미 `null`로 저장되어 자동 복구되지 않는다.
- 커넥터는 backend editor element 사이에서만 생성할 수 있다.
- Playwright 확장 브리지 모드에서 기존 도형 drag 입력이 페이지에 전달되지 않는 현상이 있었지만, 사용자가 직접 조작하면 정상 동작했다.

## 다음 작업

1. 회전 도형을 선택하고 회전·리사이즈하여 handle 방향과 반대편 고정점을 시각적으로 검증한다.
2. 새 커넥터를 만든 뒤 화살표가 선 방향을 따라 표시되는지 확인한다.
3. Ribbon의 Arrange·Align·View 버튼을 전수 검증하고 결과를 새 relay 기록에 남긴다.

## 검토받고 싶은 부분

- 회전 리사이즈가 다양한 각도와 비정사각형에서도 자연스러운지 확인이 필요하다.
- Ribbon에서 같은 Group/Ungroup 이름이 editor element용과 legacy annotation용으로 함께 보이는 UX가 명확한지 피드백이 필요하다.
- legacy annotation과 신규 editor element 사이 연결을 계속 제한할지 제품 결정이 필요할 수 있다.

## 작업 트리 상태

- 릴레이 문서 작성 직전 상태: clean
- branch: `main`
- head: `bc3fe0a`
- 원격 상태: `main`과 `origin/main` 일치

## 참고 자료

- [`../../BATON.md`](../../BATON.md)
- [`../../../current-state.md`](../../../current-state.md)
- [`../../../connector-line-progress-2026-08-14.md`](../../../connector-line-progress-2026-08-14.md)
- [`../../../adr-0001-flowmat-editor-core-boundary.md`](../../../adr-0001-flowmat-editor-core-boundary.md)
