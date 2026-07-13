# xyflow 분석

## 1. 프로젝트 개요
- 목적: React / Svelte용 노드 기반 UI(플로우차트, 다이어그램, 워크플로우 캔버스) 구축 라이브러리. React Flow 12(`@xyflow/react`)와 Svelte Flow(`@xyflow/svelte`)가 프레임워크 독립적인 `@xyflow/system` 코어를 공유하는 모노레포.
- 라이선스: MIT (상업적 사용도 무료, 후원은 선택사항)
- 기술 스택: TypeScript, pnpm workspace + turbo 빌드, React 패키지는 내부적으로 **zustand**(`zustand/traditional`의 `createWithEqualityFn`)로 전역 스토어 관리. 좌표/드래그/핸들 연결 등 저수준 로직은 DOM 이벤트 기반 바닐라 TS 클래스(XYDrag, XYHandle, XYPanZoom 등)로 프레임워크와 분리되어 있음.
- FlowMat은 이미 `@xyflow/react ^12.11.0`을 의존성으로 사용 중(레포 분석 버전과 일치) — 이번 분석은 "참고용"이 아니라 "이미 쓰는 라이브러리의 내부 구조 심층 파악"이 목적.

## 2. 전체 구조
```
xyflow/
├── packages/
│   ├── system/           # 프레임워크 독립 코어 (@xyflow/system)
│   │   └── src/
│   │       ├── types/     # NodeBase, EdgeBase, Handle 등 제네릭 타입
│   │       ├── utils/     # graph, connections, edges(경로계산), dom
│   │       ├── xydrag/    # 노드 드래그 로직
│   │       ├── xyhandle/  # 커넥션(핸들) 드래그/검증 로직
│   │       ├── xypanzoom/ # 팬/줌
│   │       └── xyresizer/ # 노드 리사이즈
│   ├── react/             # @xyflow/react (React 바인딩)
│   │   └── src/
│   │       ├── components/  # Handle, Edges(BaseEdge/BezierEdge/...), NodeWrapper, EdgeWrapper
│   │       ├── container/   # ReactFlow, NodeRenderer, EdgeRenderer, Viewport, Pane
│   │       ├── hooks/       # useNodesState, useEdgesState, useReactFlow, useStore 등
│   │       ├── store/       # zustand 스토어 정의(index.ts, initialState.ts)
│   │       ├── types/       # Node, Edge 등 React 특화 타입
│   │       └── utils/       # changes.ts, edges.ts(addEdge 등)
│   └── svelte/             # @xyflow/svelte (Svelte 바인딩)
├── examples/
│   ├── react/src/examples/  # AddNodeOnEdgeDrop 등 실전 예제 다수
│   └── svelte/
├── tests/playwright/
└── tooling/                 # eslint, postcss, rollup, tsconfig 공통 설정
```

## 3. 핵심 패턴

### 패턴 1 — Node<T>/Edge<T> 제네릭 데이터 타입 (`packages/system/src/types/nodes.ts`, `edges.ts`)
`NodeBase<NodeData, NodeType>`와 `EdgeBase<EdgeData, EdgeType>`는 `data`/`type` 필드를 제네릭으로 열어두고, 나머지(id, position, selected, draggable, zIndex 등)는 UI 상태 필드로 고정한다. `type`이 `undefined`를 허용하지 않으면 필수 필드로 강제되는 조건부 타입(conditional mapped type)까지 사용해 노드 타입별 데이터 형태를 컴파일 타임에 검증한다.

```ts
export type NodeBase<
  NodeData extends Record<string, unknown> = Record<string, unknown>,
  NodeType extends string | undefined = string | undefined
> = {
  id: string;
  position: XYPosition;      // { x, y }
  data: NodeData;
  type?: string;              // nodeTypes 맵의 key
  selected?: boolean;
  dragging?: boolean;
  parentId?: string;          // 서브플로우용
  measured?: { width?: number; height?: number };
  // ... sourcePosition, targetPosition, zIndex 등
};

export type EdgeBase<EdgeData, EdgeType> = {
  id: string;
  source: string;             // 소스 노드 id
  target: string;             // 타겟 노드 id
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: EdgeType;
  data?: EdgeData;
};
```

### 패턴 2 — zustand 기반 단일 스토어 + selector 훅 (`packages/react/src/store/index.ts`, `hooks/useStore.ts`)
전체 캔버스 상태(nodes, edges, viewport, connection 진행 상태 등)를 하나의 zustand 스토어(`createWithEqualityFn`, `zustand/shallow`)에 두고, 컴포넌트는 필요한 슬라이스만 selector로 구독한다. FlowMat도 zustand를 쓰므로 동일한 "얕은 비교 selector" 패턴을 그대로 적용할 수 있다.

```ts
// packages/react/src/store/index.ts
import { createWithEqualityFn } from 'zustand/traditional';
const createStore = ({ nodes, edges, ... }) =>
  createWithEqualityFn<ReactFlowState>((set, get) => ({ ...initialState }));

// 사용 예: packages/react/src/components/Handle/index.tsx
const { connectOnClick, noPanClassName, rfId } = useStore(selector); // shallow 비교
```

### 패턴 3 — 커스텀 Edge = path 계산 유틸 + `<BaseEdge>` 래퍼 (`packages/react/src/components/Edges/BaseEdge.tsx`, `packages/system/src/utils/edges/*`)
`getBezierPath`/`getSmoothStepPath`/`getStraightPath` 같은 순수 함수가 `[path, labelX, labelY]`를 반환하고, `<BaseEdge>`가 실제 `<path>` + (넓은 클릭 영역용) 투명 interaction path + 라벨을 렌더링한다. 커스텀 엣지는 이 두 조각만 조합하면 된다. `labelX/labelY`(엣지 중점)가 바로 "엣지 중간에 버튼/노드를 삽입"할 때 필요한 좌표다.

```tsx
export function BaseEdge({ path, labelX, labelY, label, interactionWidth = 20, ...props }: BaseEdgeProps) {
  return (
    <>
      <path {...props} d={path} className="react-flow__edge-path" />
      {interactionWidth && <path d={path} strokeOpacity={0} strokeWidth={interactionWidth} />}
      {label && <EdgeText x={labelX} y={labelY} label={label} />}
    </>
  );
}
```

### 패턴 4 — Handle 컴포넌트 = 연결점 + XYHandle 저수준 드래그 로직 분리 (`packages/react/src/components/Handle/index.tsx`)
`<Handle>`은 DOM 렌더링과 zustand selector 구독만 담당하고, 실제 포인터 다운/드래그/유효성 검증은 프레임워크 독립적인 `XYHandle.onPointerDown` / `XYHandle.isValid`(`@xyflow/system`)에 위임한다. `isValidConnection` prop으로 커스텀 연결 규칙을 주입할 수 있다.

```tsx
<Handle type="source" position={Position.Right} isValidConnection={(conn) => conn.target !== conn.source} />
```

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| 엣지 중간에 노드 삽입("middle insert connection") | `getBezierPath`/`getSmoothStepPath`가 반환하는 `labelX/labelY`(엣지 중점)에 EdgeLabelRenderer(`react-flow__edge-labels` 레이어)로 "+" 버튼을 오버레이 → 클릭 시 기존 엣지를 삭제하고 `source→newNode`, `newNode→target` 2개 엣지로 대체 | 상 | 공식 예제엔 정확히 이 유스케이스 파일은 없지만 `AddNodeOnEdgeDrop` 예제(핸들을 빈 캔버스에 드롭해 노드+엣지 동시 생성)가 동일 원리(`onConnectEnd`에서 노드+엣지 concat)를 보여줌. FlowMat의 "middle insert"는 이 패턴 + 엣지 분할 로직만 추가하면 됨 |
| 드래그로 노드 생성("drag to create") | `onConnectStart`(연결 시작 노드 id를 `ref`에 저장) + `onConnectEnd`(`event.target`이 `.react-flow__pane`인지 체크 후 `screenToFlowPosition`으로 좌표 변환, 노드+엣지 생성) | 상 | `AddNodeOnEdgeDrop` 예제를 사실상 그대로 이식 가능. `useReactFlow().screenToFlowPosition`이 핵심 |
| 노드 타입별 CSS("type based css") | 커스텀 노드 컴포넌트를 `nodeTypes` 맵에 등록하고, `NodeProps<Node<Data,'processNode'>>`처럼 제네릭으로 타입을 좁혀 컴포넌트별 스타일/data 필드를 분리 | 상 | `type`을 필수 필드로 강제하는 조건부 타입 덕에 `nodeTypes` key와 실제 노드 `type` 값의 오탈자를 컴파일 타임에 잡을 수 있음 |
| 커스텀 엣지 작성 | `<BaseEdge path={edgePath} labelX={labelX} labelY={labelY} .../>` 패턴 그대로 사용, path 계산은 `getBezierPath`/`getSmoothStepPath` 재사용 | 상 | 직접 SVG path 계산 로직을 새로 짤 필요 없음 |
| 연결 유효성 검증(ERP 자재 흐름 규칙, 예: 특정 프로세스 노드끼리만 연결 가능) | `Handle`의 `isValidConnection` prop 또는 `<ReactFlow isValidConnection={...}>` 전역 prop에 도메인 규칙(노드 타입 조합 검증) 주입 | 상 | 백엔드 워크플로우 규칙을 프론트에서도 동일하게 1차 검증하는 용도로 적합 |
| zustand selector 패턴 | FlowMat 자체 zustand 스토어(예: workspace 슬라이스)에도 `zustand/shallow`로 얕은 비교하는 selector 훅을 일관되게 적용 | 중 | xyflow 내부 스토어와 FlowMat 자체 스토어가 별도로 존재하므로 직접 공유는 안 되지만, selector 작성 컨벤션은 통일 권장 |
| Node/Edge 제네릭 타입 → 백엔드 DTO 설계 | 백엔드 Node/Edge JPA 엔티티도 `id, position(x,y), type, data(JSON), parentId` 구조로 맞추면 프론트-백엔드 직렬화 시 매핑 로직이 거의 필요 없어짐 | 중 | `measured`, `selected`, `dragging` 등 순수 UI 상태 필드는 백엔드에 저장할 필요 없음(저장 대상은 id/position/type/data/parentId 정도로 한정) |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
- `useNodesState` / `useEdgesState` (`@xyflow/react`) — 로컬 노드/엣지 상태 + `onNodesChange`/`onEdgesChange` 핸들러를 한 번에 제공. FlowMat workspace 페이지에서 이미 쓰고 있지 않다면 바로 적용 권장.
- `addEdge`, `reconnectEdge` (`packages/system/src/utils/edges/general.ts`, `@xyflow/react`에서 re-export) — 중복 엣지 방지, id 자동 생성(`getEdgeId`) 로직 내장. 엣지 중간 삽입 시 기존 엣지 제거 후 `addEdge` 두 번 호출하는 방식으로 그대로 재사용 가능.
- `useReactFlow().screenToFlowPosition` — 마우스/터치 좌표를 캔버스 좌표계로 변환. "drag to create" 구현의 핵심.
- `<BaseEdge>` + `getBezierPath`/`getSmoothStepPath`/`getStraightPath` — 커스텀 엣지 작성 시 path 계산을 직접 구현하지 말고 그대로 가져다 쓸 것.
- `<Handle isValidConnection={...}>` — ERP 도메인 연결 규칙(예: "Process 노드는 Material 노드에만 연결 가능") 주입 지점으로 바로 사용.
- `EdgeLabelRenderer` (`packages/react/src/components/EdgeLabelRenderer`) — 엣지 위에 HTML 버튼(삽입 "+" 버튼 등)을 얹을 때 사용하는 표준 컴포넌트.

### 패턴만 참고
- `NodeBase<NodeData, NodeType>` / `EdgeBase<EdgeData, EdgeType>`의 조건부 타입 설계(type이 optional/required로 갈리는 매핑 타입) — 프론트 타입 설계 참고용이며, 백엔드 JPA 엔티티 설계 시에는 "위치(x,y)와 타입, JSON data 컬럼을 분리해서 저장"하는 데이터 모델 아이디어만 차용.
- zustand 스토어를 프레임워크 독립 로직(XYDrag, XYHandle 등 순수 TS 클래스)과 분리하는 아키텍처 — FlowMat이 캔버스 관련 복잡한 로직(예: 자재 흐름 검증)을 추가할 때, UI 상태(zustand)와 순수 비즈니스 로직(별도 유틸 함수/클래스)을 분리하는 설계 참고.
- `InternalNodeBase`의 `internals.positionAbsolute`, `internals.z`(부모-자식 서브플로우 좌표 변환) — FlowMat에서 향후 그룹/서브프로세스 노드를 도입할 경우 절대좌표 계산 방식 참고.
