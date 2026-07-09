# tldraw-sync-cloudflare — 레포 분석 및 FlowMat 이식 가이드

## 1. 프로젝트 개요

**레포**: `tldraw/tldraw-sync-cloudflare`  
**목적**: tldraw의 멀티플레이어 동기화를 Cloudflare Workers + Durable Objects로 자체 호스팅하는 레퍼런스 구현  
**참고**: 별도 클론 없음 — tldraw 모노레포의 `packages/sync`, `packages/sync-core` 및 공식 문서 기반 정리

### 핵심 개념

tldraw의 멀티플레이어는 `@tldraw/sync` 패키지 기반이다.  
`tldraw-sync-cloudflare`는 그 동기화 서버를 **Cloudflare Workers + Durable Objects**로 구현하는 레퍼런스 구현이다.

### 아키텍처

```
클라이언트 (tldraw 캔버스)
    ↕ WebSocket
Cloudflare Worker (Edge 라우팅)
    ↕
Durable Object (Room별 상태 관리 + 영속성)
    ↕
R2 / KV (장기 저장)
```

### 핵심 특징

- **WebSocket 기반 실시간 동기화** — 여러 사용자가 같은 캔버스를 동시에 편집
- **Durable Object per Room** — 각 문서/방마다 독립적인 상태 머신
- **Edge 배포** — Cloudflare CDN에 가깝게 배포되어 레이턴시 최소화
- **영속성** — Durable Object 내장 스토리지 또는 R2에 캔버스 상태 저장
- **Presence** — 실시간 커서, 사용자 정보 공유

---

## 2. FlowMat과의 관계

FlowMat은 현재 **실시간 협업 기능이 없다**.  
캔버스 상태는 REST API → Spring Boot DB 방식으로만 저장되고, 동시 편집 시 충돌 처리가 없다.

팀 프로젝트(김기찬, 이정빈, 설진웅, 황현지)를 위한 FlowMat에서는  
같은 워크플로우를 여러 사람이 동시에 편집하는 **실시간 협업**이 중요한 목표다.

---

## 3. FlowMat에 이식하면 좋을 기능

### 3.1 실시간 캔버스 동기화 (핵심 과제)

tldraw-sync-cloudflare의 핵심 구조를 FlowMat에 맞게 적용하면:

```
FlowMat 캔버스 (React Flow)
    ↕ WebSocket
동기화 서버 (Spring Boot WebSocket 또는 별도 서버)
    ↕
FlowMat DB + 인메모리 상태
```

FlowMat에서 동기화해야 할 상태:
- `process` (노드) 위치, 색상, 이름 변경
- `process_io` (포트) 추가/삭제
- `process_connection` (엣지) 생성/삭제
- Presence: 누가 어떤 노드를 선택/편집 중인지

### 3.2 Room/Session 개념 (높은 우선순위)

tldraw-sync-cloudflare는 **room 단위**로 상태를 관리한다.  
FlowMat에서는 `workflow` 하나가 room 하나에 대응된다.

```
workflow_id → WebSocket Room
```

같은 workflow를 열고 있는 사용자들이 하나의 room에 속하고,  
room 내에서 모든 캔버스 변경이 브로드캐스트된다.

### 3.3 Presence (실시간 커서/상태 공유) (높은 우선순위)

가장 먼저 구현할 수 있는 협업 기능이다:
- 다른 사용자의 마우스 커서 위치 실시간 표시
- 현재 어떤 노드를 선택/편집 중인지 표시 (노드 테두리 색으로 구분)
- 온라인 사용자 목록 표시

### 3.4 충돌 해결 전략

동시 편집 시 충돌 해결 방식:

| 전략 | 설명 | FlowMat 적용 |
|---|---|---|
| Last-write-wins | 마지막 변경이 이김 | 노드 이동에 적합 |
| CRDT (Yjs 참고) | 자동 병합 | 텍스트/복잡한 상태에 적합 |
| Optimistic update + rollback | 낙관적 갱신 | 현재 FlowMat 일부 적용 중 |

FlowMat MVP에서는 **Last-write-wins + optimistic update** 조합이 현실적이다.

### 3.5 서버 구현 선택지

FlowMat 백엔드는 Spring Boot이므로 Cloudflare Workers 대신:

| 옵션 | 장점 | 단점 |
|---|---|---|
| Spring Boot WebSocket (STOMP) | 기존 스택 유지, 빠른 구현 | 수평 확장 어려움 |
| Yjs y-websocket 서버 | 검증된 CRDT 솔루션 | 별도 서버 추가 필요 |
| Cloudflare Workers | Edge 배포, 저비용 | 기존 Spring Boot와 분리, 학습 비용 |

→ 단기적으로는 **Spring Boot + WebSocket (STOMP)** 를 추가하는 것이 가장 빠르다.  
→ 장기적으로는 **Yjs 기반 서버** 분리를 고려한다.

---

## 4. 구현 로드맵 (FlowMat 기준)

```
Phase 1: Presence만 구현
  - WebSocket 연결
  - 커서 위치 브로드캐스트
  - 온라인 사용자 목록

Phase 2: 노드 이동 실시간 동기화
  - 노드 drag 이벤트 브로드캐스트
  - 다른 사용자 노드 이동 반영

Phase 3: 전체 캔버스 상태 동기화
  - 노드 생성/삭제/수정
  - 엣지 생성/삭제
  - 충돌 해결 전략 적용

Phase 4: 오프라인 지원
  - 로컬 버퍼링
  - 재연결 시 상태 복구
```

---

## 5. 요약 우선순위 테이블

| 기능 | 구현 방법 | 우선순위 |
|---|---|---|
| Presence (커서/사용자 표시) | Spring Boot WebSocket + 커스텀 | ★★★ |
| Room 개념 (workflow = room) | WebSocket 세션 관리 | ★★★ |
| 노드 이동 동기화 | broadcast + last-write-wins | ★★☆ |
| 전체 상태 동기화 | Yjs 또는 CRDT 도입 | ★★☆ |
| 오프라인 지원 | Yjs + IndexedDB | ★☆☆ |
