---
updated_at: 2026-08-14T00:54:20+09:00
author: Seoly
branch: main
head_commit: bc3fe0a
status: ready
detailed_log: ./history/2026-08/2026-08-14-0054-seoly-connectors.md
---

# Current Baton — 지금 이어갈 작업

## 방금 완료한 작업

- 에디터 도형 사이의 앵커 기반 커넥터 생성과 자동 추종을 구현했다.
- 커넥터 바인딩의 백엔드 저장·복원 경로와 JSONB 매핑을 수정했다.
- 회전 도형 리사이즈, 커넥터 화살표, 리본 편집 명령을 추가했다.
- 워크스페이스 진입 시 발생하던 `Maximum update depth exceeded` 루프를 수정했다.
- 변경사항을 기능별 커밋으로 정리해 `main`에 반영했다.

상세 근거: [`2026-08-14-0054-seoly-connectors.md`](./history/2026-08/2026-08-14-0054-seoly-connectors.md)

## 현재 상태

- `main`과 `origin/main`은 `bc3fe0a`에서 일치한다.
- 릴레이 문서 추가 전 코드 작업 트리는 clean 상태였다.
- 커넥터 생성, 저장 후 복원, 도형 이동 시 실시간 추종은 이전 세션에서 확인했다.
- 알려진 blocker는 없다.

## 다음 사람이 먼저 할 일

1. 회전된 도형의 리사이즈 핸들과 반대편 고정점이 실제 화면에서 자연스러운지 확인한다.
2. 커넥터 끝 화살표가 생성·이동·회전 후에도 올바른 방향으로 렌더링되는지 확인한다.
3. Ribbon의 Arrange·Align·View 신규 버튼을 실제 화면에서 하나씩 검증한다.

## 확인이 필요한 부분

- 여러 브라우저 세션에서 editor document가 갱신될 때 커넥터 바인딩도 함께 동기화되는지는 미검증이다.
- 커넥터는 신규 backend editor element끼리만 연결되며 legacy annotation 도형에는 연결되지 않는다.
- adapter 수정 전에 저장된 테스트 커넥터는 바인딩이 `null`인 기존 데이터로 남아 있을 수 있다.

## 검증 결과

- 직전 작업 기록 기준 frontend build, TypeScript, lint, unit test가 통과했다.
- 커넥터 저장·복원과 도형 이동 추종은 브라우저에서 확인했다.
- 이 릴레이 체계를 추가하면서 코드 빌드나 테스트를 다시 실행하지는 않았다.

## 작업 트리 상태

- 릴레이 문서 작성 직전: clean
- 기준 commit: `bc3fe0a`
- 이 문서 체계 자체는 다음 `docs(relay)` 커밋에 포함한다.
