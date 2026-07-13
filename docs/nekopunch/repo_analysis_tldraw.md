# tldraw 분석

## 1. 프로젝트 개요
- 목적: React 기반 무한 캔버스 화이트보드/다이어그램 SDK. `<Tldraw />` 컴포넌트 하나로 완전한 캔버스 에디터를 제공하며, 커스텀 도형(shape)·툴·바인딩(연결)·UI를 확장해 워크플로우 빌더, 채팅 캔버스, 이미지 파이프라인 등 다양한 앱을 만들 수 있는 SDK. 저장소에는 `templates/workflow`라는 **노드 기반 워크플로우 빌더 스타터킷**이 포함되어 있어 FlowMat과 목적이 거의 동일하다.
- 라이선스: 소스는 공개되어 있으나 `tldraw license`(자체 라이선스) — 개발 중 무료 사용 가능, 프로덕션 사용 시 라이선스 키 필요. 완전한 MIT는 아님 (단, `create-tldraw` 스타터킷들은 MIT).
- 기술 스택: React + TypeScript, 모노레포(Yarn workspaces, Lerna), 자체 반응형 상태 라이브러리(`@tldraw/state`, signal 기반), 자체 스토어(`@tldraw/store`), 자체 스키마/마이그레이션(`@tldraw/tlschema`), 실시간 동기화(`@tldraw/sync`, `@tldraw/sync-core`, Cloudflare Durable Objects + SQLite 기반 서버 예시).

## 2. 전체 구조

```
tldraw/
├── apps/                  # dotcom(tldraw.com), docs, vscode 확장, examples 등 실제 애플리케이션
│   ├── dotcom/
│   ├── docs/
│   └── examples/
├── packages/               # 핵심 SDK 패키지 (모노레포)
│   ├── editor/             # 캔버스 에디터 코어 (Editor 클래스, ShapeUtil, BindingUtil, 도구/상태머신)
│   ├── store/               # 반응형 레코드 스토어 (RecordType, RecordsDiff, migrate, Store)
│   ├── tlschema/            # 데이터 모델 정의 (레코드/도형/바인딩 스키마 + 마이그레이션 시퀀스)
│   ├── tldraw/               # 위 패키지들을 조합한 완제품 <Tldraw/> 컴포넌트 + 기본 UI/도형셋
│   ├── sync-core/            # 동기화 프로토콜 (룸, diff, 소켓 어댑터, 저장소 어댑터)
│   ├── state / state-react/  # 반응형 원자/시그널 상태 라이브러리
│   ├── validate/             # 런타임 스키마 검증자(T.*)
│   └── utils/                # 공용 유틸
├── templates/
│   ├── workflow/            # ★ 노드 기반 워크플로우 빌더 스타터킷 (FlowMat과 도메인 동일)
│   │   └── src/{nodes, connection, ports, execution, components}/
│   ├── sync-cloudflare/      # 자체 호스팅 실시간 협업 서버 예시
│   └── (agent, chat, image-pipeline, branching-chat, shader ...)
└── skills/, .agents/         # 저장소 자체의 Claude 개발 워크플로우 스킬들
```

## 3. 핵심 패턴

### 패턴 1 — 레코드 스키마 + 점진적 마이그레이션 시스템
모든 데이터(도형, 페이지, 바인딩, 자산 등)는 `typeName`을 가진 평범한 JS 객체(`TLRecord`)이며, 각 레코드 타입/전체 스토어마다 **버전이 매겨진 마이그레이션 시퀀스**를 등록한다. 마이그레이션은 `sequenceId/version` 형태의 ID로 식별되고, `up`(필수) / `down`(선택)을 갖는다. `scope: 'record'`는 개별 레코드에, `scope: 'storage'`는 스토어 전체(레코드 추가/삭제 포함)에 적용된다. 로드 시점에 저장된 스키마 버전과 코드의 최신 버전을 비교해 필요한 마이그레이션만 순서대로 적용한다(`packages/store/src/lib/migrate.ts`, `packages/tlschema/src/store-migrations.ts`).

```ts
// packages/tlschema/src/store-migrations.ts (축약)
const Versions = createMigrationIds('com.tldraw.store', {
  RemoveCodeAndIconShapeTypes: 1,
  FixIndexKeys: 5,
} as const)

export const storeMigrations = createMigrationSequence({
  sequenceId: 'com.tldraw.store',
  retroactive: false,
  sequence: [
    { id: Versions.FixIndexKeys, scope: 'record', up: (record) => { /* mutate record */ } },
  ],
})
```

Flyway/JPA와의 차이: Flyway는 **DB 스키마(DDL)** 버전을, tldraw 마이그레이션은 **애플리케이션 레벨 문서 데이터(JSON snapshot)** 버전을 관리한다. JPA는 컬럼 추가 시 DDL 마이그레이션은 되지만 "이미 저장된 JSON payload(예: props 컬럼)의 구조 변경"은 다루지 못한다. Process/Workflow 엔티티에 `props`류의 JSON 컬럼(자재 속성, 노드 설정 등)이 있다면, 이 패턴을 그대로 참고해 애플리케이션 레이어에서 레코드별 마이그레이션 시퀀스를 두는 것이 유효하다.

### 패턴 2 — RecordsDiff 기반 변경 추적 (undo/redo, 감사 로그, 동기화의 공통 기반)
스토어의 모든 변경은 `{ added, updated: [from,to], removed }` 형태의 `RecordsDiff`로 표현된다(`packages/store/src/lib/RecordsDiff.ts`). 이 구조는 세 곳에 재사용된다: (1) `reverseRecordsDiff`로 undo 스택 구현, (2) `squashRecordDiffs`로 여러 트랜잭션을 하나로 합쳐 리스너/네트워크 전송 최적화, (3) `sync-core`의 `getNetworkDiff`에서 `put/patch/remove` 형태의 경량 네트워크 diff로 변환.

```ts
export interface RecordsDiff<R extends UnknownRecord> {
  added: Record<IdOf<R>, R>
  updated: Record<IdOf<R>, [from: R, to: R]>
  removed: Record<IdOf<R>, R>
}
// reverseRecordsDiff(diff) -> undo에 사용되는 역방향 diff
```

FlowMat의 워크플로우 변경 이력(audit log)이나 undo 기능에 이 "add/update(from,to)/remove" 삼중 구조를 그대로 채택하면, DB 감사 테이블 설계(변경 전/후 값 저장)와 프론트 undo 스택 설계를 동일한 모델로 통일할 수 있다.

### 패턴 3 — Shape/Binding Util 확장 시스템 (타입별 노드 = 클래스 레지스트리)
새로운 도형 타입은 `ShapeUtil`을 상속한 클래스로 정의하고, `static type`으로 식별자를, `props`로 zod류 검증 스키마를, `getDefaultProps/component/getGeometry` 등으로 렌더링·동작을 정의한다. 도형 간의 "연결"은 도형 자체가 아니라 별도의 **Binding** 레코드(`fromId`/`toId` + `props`)로 표현되어, 도형과 연결 관계가 분리된다(`packages/editor/src/lib/editor/bindings/BindingUtil.ts`). `templates/workflow`는 이 패턴으로 워크플로우 노드를 구현한 실제 예시다: `NodeShapeUtil`(도형) + `ConnectionBindingUtil`(연결) + 타입별 `NodeDefinition` 레지스트리(`nodeTypes.tsx`)로 add/subtract/conditional/slider 등 노드 타입을 확장한다.

```ts
// templates/workflow/src/nodes/nodeTypes.tsx (축약)
export const NodeDefinitions = {
  add: AddNodeDefinition,
  conditional: ConditionalNodeDefinition,
  slider: SliderNodeDefinition,
} satisfies Record<string, NodeDefinitionConstructor<any>>

export function getNodeDefinition(editor: Editor, node: NodeType) {
  return getNodeDefinitions(editor)[node.type]  // 타입별 컴포넌트/실행 로직 디스패치
}
```

FlowMat이 이미 xyflow(React Flow)로 node/edge를 그리고 있으므로 ShapeUtil을 그대로 가져올 필요는 없지만, "타입 문자열 → 정의 객체(컴포넌트, 기본 props, 실행 로직) 매핑 레지스트리" 구조는 그대로 이식 가능하다.

### 패턴 4 — 엣지 중간 노드 삽입 (middle insert connection)
FlowMat이 최근 구현한 것과 동일한 기능이 `templates/workflow/src/connection/insertNodeWithinConnection.tsx`에 참고 구현으로 존재한다. 흐름은: 기존 커넥션의 시작/끝 바인딩을 조회 → 새 노드의 좌표를 두 도형 사이 중간으로 계산 → 새 노드 생성 → 기존 커넥션을 "시작→새 노드"로 재바인딩 → "새 노드→끝"으로 향하는 새 커넥션 생성 → 하류 노드들과 충돌 시 우측으로 밀어내는 애니메이션 처리. `editor.markHistoryStoppingPoint()`/`editor.bailToMark()`로 하나의 원자적 undo 단위를 보장한다.

```ts
// templates/workflow/src/connection/insertNodeWithinConnection.tsx (축약)
const mark = editor.markHistoryStoppingPoint()
const newNodeId = createShapeId()
editor.createShape({ type: 'node', id: newNodeId, x, y, props: { node: nodeType } })
createOrUpdateConnectionBinding(editor, connection, newNodeId, { portId: firstInputPort.id, terminal: 'end' })
// 새 커넥션: 새 노드 -> 원래 끝 노드
createOrUpdateConnectionBinding(editor, newConnectionId, originalBindings.end.toId, { ... })
moveNodesIfNeeded(editor, newNodeId, originalBindings.end.toId) // 하류 노드 재배치 애니메이션
```

### 패턴 5 (참고) — Diff 기반 실시간 동기화
`sync-core`는 서버(`TLSyncRoom`)가 진리의 원천(source of truth)이 되어 각 클라이언트의 `RecordsDiff`를 받아 논리 클럭을 증가시키고, `getNetworkDiff`로 `put/patch/remove` 압축 diff를 만들어 60fps 미만으로 스로틀링(`DATA_MESSAGE_DEBOUNCE_INTERVAL`)해 브로드캐스트하는 구조다. Last-Write-Wins에 가까운 단순 모델이며, CRDT 같은 복잡한 병합은 사용하지 않는다.

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| RecordsDiff (added/updated[from,to]/removed) | 워크플로우 변경 이력 API 응답 및 프론트 undo 스택 자료구조로 채택. 백엔드는 저장 시 변경 전/후 값을 캡처하는 감사 테이블(`workflow_change_log`)에, 프론트는 zustand 스토어에 동일 스키마 적용 | 상 | 구조가 단순하고 언어 무관하게 이식 가능 |
| 타입별 노드 정의 레지스트리 (`type -> definition`) | xyflow의 `nodeTypes` prop과 함께, 백엔드는 JPA 엔티티에 `discriminator`(type) 컬럼 + 타입별 기본 props를 두고, 프론트는 `NodeDefinitions` 같은 맵으로 컴포넌트/검증/기본값을 한 곳에서 관리 | 상 | 이미 진행 중인 "타입 기반 CSS" 작업과 직결 |
| 엣지 중간 노드 삽입 로직 (히스토리 마크, 재바인딩, 하류 재배치) | xyflow의 edge 클릭 핸들러에서 동일 알고리즘(중간 좌표 계산 → 기존 edge 재타겟팅 → 신규 edge 생성 → 충돌 시 하류 노드 이동)으로 재구현 | 상 | 이미 "middle insert connection" 커밋이 있어 바로 비교/보완 가능 |
| 레코드/스토어 마이그레이션 시퀀스 | Process/Workflow 엔티티의 JSON(props) 컬럼에 애플리케이션 레벨 버전 필드 + 버전별 변환 함수 체인 도입. DDL은 Flyway로, JSON payload 변환은 별도 마이그레이션 러너로 이원화 | 중 | 기존 Flyway 마이그레이션과 별개 레이어로 추가 필요 |
| Binding(연결)과 Shape(도형)의 레코드 분리 | Edge 자체를 노드 속성이 아닌 독립 엔티티/레코드로 유지(이미 xyflow 구조상 유사) — from/to 뿐 아니라 포트 ID, 연결 메타데이터까지 별도 레코드로 관리 | 중 | ERD 설계 시 Connection 테이블에 portId 등 확장 필드 고려 |
| Diff 기반 실시간 동기화(스로틀 브로드캐스트) | 다중 사용자 동시 편집이 로드맵에 있다면, WebSocket(STOMP)에서 전체 캔버스가 아닌 RecordsDiff류의 압축 diff만 전송 + 스로틀 적용 | 하 | 현재 FlowMat에 실시간 협업 요구사항이 명시되지 않아 우선순위 낮음 |
| 히스토리 스토핑 포인트(`markHistoryStoppingPoint`/`bailToMark`) | 다단계 작업(노드 생성+재연결+이동)을 하나의 undo 단위로 묶는 트랜잭션 마커를 zustand 히스토리 미들웨어에 도입 | 중 | 엣지 중간 삽입처럼 여러 스토어 조작이 얽히는 기능에 유용 |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
- 없음(라이선스·런타임 제약). tldraw SDK 자체(`tldraw` npm 패키지)를 캔버스 라이브러리로 채택할 수도 있으나, FlowMat은 이미 `@xyflow/react`로 캔버스를 구현 중이므로 SDK 자체를 갈아끼우는 것은 권장하지 않음. 다만 `templates/workflow`는 tldraw SDK에 의존하므로 tldraw 자체 라이선스(개발 중 무료, 프로덕션 사용 시 라이선스 키 필요)를 따른다 — 코드를 그대로 복사하는 것은 권장하지 않고, 알고리즘(중간 노드 삽입 시 좌표 계산, 하류 재배치 로직, `RecordsDiff`/`squashRecordDiffs` 유틸 함수의 동작 방식)만 참고해 TypeScript로 새로 작성하는 것이 안전함.

### 패턴만 참고 (재구현 필요)
- `@tldraw/store`의 반응형 스토어·마이그레이션 시스템 전체: tldraw 자체 시그널 라이브러리(`@tldraw/state`)에 강하게 결합되어 있어, Spring Boot 백엔드에서는 개념(레코드 버전, up/down 마이그레이션 시퀀스, retroactive 플래그)만 차용해 JPA 엔티티 + JSON 컬럼 버저닝 전략으로 재구현해야 함.
- `sync-core`의 룸/소켓/논리클럭 동기화 프로토콜: Cloudflare Durable Objects 및 자체 프로토콜에 특화되어 있어, Spring Boot + WebSocket(STOMP)/Redis Pub-Sub 조합으로 diff 전송 개념만 재구현해야 함.
- `ShapeUtil`/`BindingUtil` 클래스 확장 구조: React Flow의 `nodeTypes`/커스텀 엣지 API와 이미 다르므로 그대로 가져올 수 없고, "타입 문자열 기반 정의 레지스트리"라는 아이디어만 재구현.
