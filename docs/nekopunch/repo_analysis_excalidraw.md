# excalidraw 분석

## 1. 프로젝트 개요
- 목적: 손그림 스타일의 오픈소스 무한 캔버스 화이트보드. 실시간 협업 및 종단간 암호화를 지원하는 드로잉/다이어그램 도구.
- 라이선스: MIT
- 기술 스택: React + TypeScript, Vite, Yarn 워크스페이스 기반 모노레포. 캔버스 렌더링은 자체 rough.js 기반 렌더러(외부 캔버스 라이브러리 미사용). 협업은 `socket.io-client` + AES-GCM 암호화. 상태 관리는 자체 `Store`/`Scene` 클래스(Redux/Zustand 미사용).

## 2. 전체 구조
```
excalidraw/
├── packages/
│   ├── excalidraw/        # 메인 npm 패키지 (에디터 UI, 액션, 데이터 IO)
│   │   ├── components/    # React 컴포넌트 (App.tsx 등)
│   │   ├── data/          # 직렬화, 로컬저장, reconcile(협업 병합), restore
│   │   ├── scene/         # 렌더러, export, zoom
│   │   ├── actions/       # 커맨드 패턴 액션들 (undo/redo 연동)
│   │   └── ...
│   ├── element/            # 엘리먼트 데이터 모델 전용 패키지
│   │   ├── src/Scene.ts   # 씬(엘리먼트 컬렉션) 관리 클래스
│   │   ├── src/store.ts   # 변경 캡처/델타/히스토리 스토어
│   │   ├── src/fractionalIndex.ts  # 협업용 순서 관리
│   │   ├── src/mutateElement.ts    # 버전 증가 뮤테이션 헬퍼
│   │   └── src/delta.ts   # 엘리먼트/앱상태 델타(diff) 정의
│   ├── common/             # 공용 유틸, 상수
│   ├── math/                # 기하 연산
│   └── utils/, laser-pointer/, fractional-indexing/
├── excalidraw-app/          # excalidraw.com 실제 배포 앱 (npm 패키지 소비 예시)
│   ├── collab/             # 실시간 협업 구현체 (Portal, Collab)
│   ├── data/                # firebase 연동, 로컬 저장
│   └── ...
├── dev-docs/                 # Docusaurus 공식 문서
└── examples/                  # 통합 예제
```

## 3. 핵심 패턴

### 패턴 1: 낙관적 버저닝 + versionNonce 기반 결정론적 충돌 해결
모든 엘리먼트는 `version`(증가하는 정수), `versionNonce`(변경마다 재생성되는 난수), `updated`(타임스탬프), `isDeleted`(soft-delete 플래그)를 가진다. 협업/저장 시 서버는 별도 락 없이 각 클라이언트가 보낸 엘리먼트를 버전 비교만으로 병합한다.

```ts
// packages/element/src/types.ts
type _ExcalidrawElementBase = Readonly<{
  version: number;       // 변경마다 +1
  versionNonce: number;  // 변경마다 랜덤 재생성 (동시 편집 tie-break용)
  isDeleted: boolean;    // 실제 삭제 대신 플래그만 세움
  updated: number;       // epoch ms
  ...
}>;

// packages/element/src/mutateElement.ts
element.version = (version ?? element.version) + 1;
element.versionNonce = randomInteger();
```

### 패턴 2: reconcile - 로컬/원격 엘리먼트 병합 알고리즘
`shouldDiscardRemoteElement`가 "로컬이 편집 중이거나(local.version > remote.version), 버전이 같으면 versionNonce가 더 작은 쪽을 채택"하는 규칙으로 원격 값을 버릴지 결정한다. Last-Write-Wins과 유사하지만 CRDT 없이 결정론적 tie-break만으로 수렴을 보장한다.

```ts
// packages/excalidraw/data/reconcile.ts
export const shouldDiscardRemoteElement = (localAppState, local, remote) => {
  if (local && (
      local.id === localAppState.editingTextElement?.id ||
      local.version > remote.version ||
      (local.version === remote.version && local.versionNonce <= remote.versionNonce)
  )) return true;
  return false;
};
```

### 패턴 3: Fractional Indexing 기반 순서 관리
엘리먼트의 z-order(및 워크플로우라면 노드 정렬 순서)를 배열 인덱스가 아니라 문자열 기반 `index` 필드(fractional index, 예: `"a0"`, `"a1V"`)로 관리한다. 두 엘리먼트 사이에 새 엘리먼트를 끼워 넣을 때 그 사이 값의 새 인덱스만 생성하면 되므로, 다른 엘리먼트의 인덱스를 건드리지 않고 순서를 삽입/재배치할 수 있다. 협업 시 재정렬 충돌이 나면 `syncInvalidIndices`로 복구한다.

```ts
// packages/element/src/types.ts
index: FractionalIndex | null; // 배열 순서와 항상 동기화되는 정렬 키

// packages/element/src/fractionalIndex.ts
// "Array should be used as a cache of elements order,
//  hiding the internal fractional indices implementation."
```

### 패턴 4: WebSocket 델타 브로드캐스트 + 암호화
`Portal` 클래스가 마지막으로 브로드캐스트한 `version`을 엘리먼트 ID별로 캐시(`broadcastedElementVersions`)해 두고, 그보다 버전이 높아진 엘리먼트만 골라 전송한다(대역폭 절약). 페이로드는 JSON 직렬화 후 AES로 암호화되어 서버는 내용을 볼 수 없는 구조(E2EE, 서버는 단순 릴레이).

```ts
// excalidraw-app/collab/Portal.tsx
const syncableElements = elements.reduce((acc, element) => {
  if ((syncAll || element.version > this.broadcastedElementVersions.get(element.id)!) 
      && isSyncableElement(element)) {
    acc.push(element);
  }
  return acc;
}, []);
// ... encryptData(roomKey, encoded) 후 socket.emit
```

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| version/versionNonce/updated/isDeleted 필드 | JPA `WorkflowNode`/`WorkflowEdge` 엔티티에 동일 필드 추가 (soft-delete + 낙관적 동시성) | 상 | JPA `@Version`은 정수 1개뿐이라 versionNonce 컨셉 추가 시 tie-break 로직은 서비스 레이어에서 별도 구현 필요 |
| reconcile 병합 알고리즘 | React Flow 클라이언트 상태와 서버 저장본을 병합하는 커스텀 훅/서비스로 재구현 (실시간 협업 도입 시) | 중 | 지금은 단일 사용자 편집이면 우선순위 낮음. 다중 사용자 편집 로드맵이 생기면 최우선 |
| Fractional Indexing으로 노드/엣지 순서 관리 | "엣지 중간에 노드 삽입" 기능에 직접 적용 가능 — 삽입 시 앞뒤 노드의 index 사이 값만 새로 계산 | 상 | 현재 드래그 삽입 기능 개발 방향과 정확히 일치. `@excalidraw/fractional-indexing` 라이브러리 자체를 프론트에서 재사용 가능 |
| WebSocket 델타 브로드캐스트(버전 캐시로 최소 전송) | Spring WebSocket(STOMP) + 클라이언트 측 "마지막 전송 버전" 캐시로 재구현 | 하 | 협업 기능이 로드맵에 있을 때만 필요 |
| JSON export/import 스키마(`ExportedDataState`) | 워크플로우 캔버스의 import/export(백업, 템플릿 공유) 기능 설계 시 필드 구성 참고 | 중 | `type`, `version`, `elements`, `appState` 형태의 최상위 스키마 참고 가능 |
| Store의 CaptureUpdateAction(IMMEDIATELY/NEVER/EVENTUALLY) | 프론트 zustand 스토어에서 undo/redo 캡처 대상 여부를 액션 단위로 태깅하는 방식 참고 | 하 | 캔버스 undo/redo 기능 도입 시 유용 |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
- `@excalidraw/fractional-indexing` 패키지(별도 npm 패키지로 분리되어 있음) — FlowMat이 React Flow 위에서 노드/엣지 순서를 문자열 키로 관리하고 싶다면 그대로 npm 의존성으로 가져와 쓸 수 있음. 순수 유틸리티라 프레임워크 종속 없음.

### 패턴만 참고 (재구현 필요)
- element 버저닝/soft-delete 모델: TypeScript 타입 정의를 그대로 쓸 수 없고, Spring Boot JPA 엔티티(`@Version`, `deletedAt`/`isDeleted` 컬럼, `updatedAt`)로 재설계해야 함.
- reconcile 병합 로직: excalidraw는 클라이언트 상태(로컬)와 소켓으로 받은 원격 상태를 비교하는 순수 함수인데, FlowMat은 Spring Boot 서버가 진실 소스(source of truth)이므로 서버 측 낙관적 락 + 클라이언트 재동기화 전략으로 재구현해야 함.
- WebSocket 프로토콜 및 암호화 계층: socket.io/AES 조합은 Spring의 STOMP/SockJS 생태계와 다르므로 프로토콜 자체보다 "버전 캐시로 델타만 보낸다"는 설계 아이디어만 차용.
- Store의 델타(Delta)/히스토리 클래스 구조: zustand 기반 undo/redo를 만들 때 구조적 아이디어(엘리먼트 델타, 앱상태 델타 분리)만 참고하고 구현은 새로 작성.
