# xyflow (React Flow) — 전수조사 보고서 및 FlowMat 이식 가이드

> 조사 기준: `E:\projects\git\xyflow` 로컬 클론 직접 분석  
> 버전: @xyflow/react v12.11.2, @xyflow/system v0.0.79

## 1. 레포 전체 구조

```
xyflow/
├── packages/
│   ├── react/src/
│   │   ├── components/         - Handle, NodeWrapper, EdgeWrapper 등
│   │   ├── additional-components/
│   │   │   ├── Background/     - 배경 패턴
│   │   │   ├── Controls/       - 줌 컨트롤
│   │   │   ├── MiniMap/        - 미니맵
│   │   │   ├── NodeResizer/    - 노드 리사이즈
│   │   │   ├── NodeToolbar/    - 노드 도구모음 ← FlowMat 미사용
│   │   │   └── EdgeToolbar/    - 엣지 도구모음 ← FlowMat 미사용
│   │   ├── hooks/              - useReactFlow, useNodesState 등 50+ 훅
│   │   ├── container/          - NodeRenderer, EdgeRenderer
│   │   ├── store/              - Zustand 기반 ReactFlowStore
│   │   ├── types/              - 전체 타입 정의
│   │   └── index.ts            - 공개 API exports
│   └── system/src/
│       ├── utils/edges/        - getBezierPath, getSmoothStepPath 등
│       ├── xyhandle/           - Handle 위치 계산
│       ├── xyresizer/          - NodeResizer 시스템 구현
│       └── xydrag/             - 드래그 처리
├── examples/react/src/examples/ - 고급 예제들
└── tests/                       - E2E + 유닛 테스트
```

---

## 2. ReactFlowStore 내부 구조

**파일**: `packages/react/src/types/store.ts`

```ts
type ReactFlowStore = {
  // 그래프 데이터
  nodes: Node[]
  edges: Edge[]
  nodeLookup: Map<string, InternalNode>  // O(1) ID 조회
  edgeLookup: Map<string, Edge>
  connectionLookup: Map<string, Map<string, Connection>>  // 연결 관계 인덱스
  parentLookup: Map<string, InternalNode[]>  // Sub-flows 계층 관리

  // 변환 상태
  transform: [x: number, y: number, zoom: number]
  translateExtent: CoordinateExtent
  nodeExtent: CoordinateExtent

  // 상호작용 상태
  connection: ConnectionState
  connectionMode: ConnectionMode  // strict | loose
  panZoom: PanZoomInstance | null

  // 선택 상태
  nodesSelectionActive: boolean
  userSelectionActive: boolean
  userSelectionRect: SelectionRect | null

  // v12+ 미들웨어
  onNodesChangeMiddlewareMap: Map<Symbol, Function>
  onEdgesChangeMiddlewareMap: Map<Symbol, Function>
}
```

Connection lookup 키 패턴: `${nodeId}-${type}-${handleId}` 또는 `${nodeId}-${type}`

**FlowMat 참고:**  
현재 FlowMat의 `workspaceStore`와 TanStack Query 사이에서  
노드 조회가 `canvas.nodeMap`을 통해 이루어지고 있다.  
`nodeLookup`, `parentLookup`, `connectionLookup` 세 인덱스 구조를 참고해  
`workspaceStore`의 인덱스 구조를 개선할 수 있다.

---

## 3. 현재 FlowMat이 미사용 중인 기능들

### 3.1 NodeToolbar — 노드 선택 시 도구 버튼 (즉시 적용 가능)

**파일**: `packages/react/src/additional-components/NodeToolbar/NodeToolbar.tsx`

```tsx
// CanvasNode.tsx 내부에 추가
<NodeToolbar
  nodeId={node.id}
  position={Position.Top}
  offset={10}
  align="center"
  isVisible={selected}  // undefined면 선택 시만 표시
>
  <button onClick={() => onDuplicate(node.id)}>복제</button>
  <button onClick={() => onDelete(node.id)}>삭제</button>
  <button onClick={() => onAddChild(node.id)}>노드 추가</button>
</NodeToolbar>
```

특징:
- 뷰포트 스케일 적용 안됨 (항상 일정 크기)
- 다중 선택 시 자동으로 숨겨짐
- Portal로 정확한 위치 계산

**FlowMat 적용:** 현재 우클릭 컨텍스트 메뉴나 우측 Inspector가 담당하는 삭제/복제를 노드 바로 위에 플로팅 버튼으로 노출 가능.

**구현 복잡도**: 낮음

---

### 3.2 EdgeToolbar — 엣지 선택 시 제어 버튼 (즉시 적용 가능)

**파일**: `packages/react/src/additional-components/EdgeToolbar/EdgeToolbar.tsx`

```tsx
// CanvasEdge.tsx 내부에 추가
<EdgeToolbar
  edgeId={edge.id}
  x={centerX}
  y={centerY}
  isVisible={edge.selected}
>
  <button onClick={() => onDelete(edge.id)}>×</button>
</EdgeToolbar>
```

**구현 복잡도**: 낮음

---

### 3.3 MiniMap — 전체 그래프 미니맵 (즉시 적용 가능)

**파일**: `packages/react/src/additional-components/MiniMap/MiniMap.tsx`

```tsx
<MiniMap
  position="bottom-right"
  width={200}
  height={150}
  nodeColor={(node) => node.data.colorScheme ?? '#e2e8f0'}
  nodeStrokeColor="#94a3b8"
  nodeStrokeWidth={2}
  pannable={true}
  zoomable={true}
  onNodeClick={(event, node) => selectNode(node.id)}
/>
```

내부 최적화:
- `getInternalNodesBounds()` + `getBoundsOfRects()`로 전체 범위 계산
- `custom rectEqual`로 불필요한 리렌더링 방지

**구현 복잡도**: 낮음

---

### 3.4 Snap to Grid (즉시 적용 가능)

```tsx
<ReactFlow
  snapToGrid={true}
  snapGrid={[20, 20]}   // [gridSizeX, gridSizeY]
  {...props}
/>
```

**구현 복잡도**: 낮음 (prop 하나)

---

### 3.5 onBeforeDelete — 삭제 전 가로채기 (즉시 적용 가능)

**파일**: ReactFlow Store `deleteElements` 함수

```tsx
<ReactFlow
  onBeforeDelete={async ({ nodes, edges }) => {
    // false 반환 → 삭제 취소
    if (nodes.some(n => n.data?.locked)) {
      alert('잠긴 노드는 삭제할 수 없습니다.')
      return false
    }

    // 필터링된 객체 반환 → 부분 삭제
    return {
      nodes: nodes.filter(n => !n.data?.locked),
      edges,
    }
  }}
/>
```

**FlowMat 적용:** 현재 Delete 키 이벤트를 직접 처리하는데, `onBeforeDelete`로 교체하면 더 일관된 삭제 흐름 보장.

**구현 복잡도**: 낮음

---

### 3.6 useNodesState / useEdgesState (적용 권장)

**파일**: `packages/react/src/hooks/useNodesEdgesState.ts`

```tsx
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

// onNodesChange 내부에서 applyNodeChanges() 자동 호출
// 변경 타입: select | position | dimensions | remove | replace | add

function handleNodesChange(changes: NodeChange[]) {
  onNodesChange(changes)

  // position 변경 중 드래그가 끝나면 서버에 저장
  const positionChanges = changes.filter(
    c => c.type === 'position' && !c.dragging
  )
  positionChanges.forEach(c => saveNodePosition(c.id, c.position))
}
```

**FlowMat 현황:**  
현재 `canvas.nodes`를 ReactFlow에 직접 전달하는 방식이라  
드래그 중 노드 위치가 외부 상태에 반영되지 않는다.  
`useNodesState`로 전환하면 드래그 중 위치도 내부 상태로 관리되어  
더 자연스러운 UX가 가능하다.

**구현 복잡도**: 중간 (기존 상태 흐름 리팩터링 필요)

---

### 3.7 useConnection — 연결 드래그 중 상태 추적

**파일**: `packages/react/src/hooks/useConnection.ts`

```tsx
// Handle 컴포넌트 내부에서
const connection = useConnection()
// connection.inProgress, connection.from, connection.to, connection.fromNode 등

// 연결 드래그 중일 때 Handle 색상 동적 변경
const isConnecting = connection.inProgress
const isTarget = connection.to?.nodeId === nodeId
```

**FlowMat 적용:** 포트에 연결선을 드래그해올 때 유효한 연결인지 시각적 피드백 제공 가능.

**구현 복잡도**: 낮음

---

### 3.8 useNodeConnections — 노드 연결 현황 훅

**파일**: `packages/react/src/hooks/useNodeConnections.ts`

```tsx
// 특정 노드의 연결 현황 구독
const connections = useNodeConnections({
  handleType: 'target',
  handleId: 'my-port-id',
  onConnect: (connections) => console.log('연결됨', connections),
  onDisconnect: (connections) => console.log('해제됨', connections),
})
```

**FlowMat 적용:** 포트별 연결 현황을 실시간으로 NodeInspector에 표시 가능.

**구현 복잡도**: 낮음

---

### 3.9 useUpdateNodeInternals — 동적 핸들 추가/삭제 후 갱신

**파일**: `packages/react/src/hooks/useUpdateNodeInternals.ts`

```tsx
const updateNodeInternals = useUpdateNodeInternals()

// I/O 포트가 추가/삭제된 후 호출
async function handlePortCreate(input) {
  await createPort(input)
  updateNodeInternals(processId)  // Handle 위치 재계산
}
```

**FlowMat 현황:** 현재 포트 추가/삭제 후 캔버스 전체를 쿼리 invalidate하는데,  
`updateNodeInternals`를 호출하면 해당 노드만 재계산해서 더 빠르다.

**구현 복잡도**: 낮음

---

### 3.10 Edge 라우팅 다양화

**파일**: `packages/system/src/utils/edges/smoothstep-edge.ts` (300줄)

```tsx
// getSmoothStepPath — 직각 꺾임 + 둥근 코너
const [path, labelX, labelY] = getSmoothStepPath({
  sourceX, sourceY, sourcePosition: Position.Right,
  targetX, targetY, targetPosition: Position.Left,
  borderRadius: 10,    // 코너 둥글기
  offset: 20,          // 노드에서 떨어진 거리
  stepPosition: 0.5,   // 꺾이는 지점 (0=source, 0.5=중간, 1=target)
})

// getElbowPath — 완전 직각
// getBezierPath — 베지어 곡선 (현재 FlowMat 기본값)
// getStraightPath — 직선
```

FlowMat의 `connectionType`별로 다른 라우팅 적용:
```tsx
const pathFn = {
  material_flow:  getSmoothStepPath,  // 물리적 흐름 → 직각
  data_flow:      getBezierPath,      // 데이터 흐름 → 곡선
  control_flow:   getStraightPath,    // 제어 흐름 → 직선
}[connectionType] ?? getBezierPath
```

**구현 복잡도**: 낮음

---

### 3.11 Edge Markers — 화살표 마커

**파일**: `packages/system/src/utils/marker.ts`

```tsx
const edges = [{
  id: 'e1',
  source: '1', target: '2',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#64748b',
    width: 20,
    height: 20,
  },
  markerStart: {
    type: MarkerType.Arrow,
  },
}]
```

사용 가능한 마커: `MarkerType.Arrow`, `MarkerType.ArrowClosed`  
커스텀 SVG 마커도 가능 (string ID로 참조).

**구현 복잡도**: 낮음

---

### 3.12 CustomConnectionLine — 연결 드래그 중 선 커스터마이징

**파일**: `examples/react/src/examples/CustomConnectionLine/ConnectionLine.tsx`

```tsx
function CustomConnectionLine({
  fromX, fromY, toX, toY,
  fromPosition, toPosition,
  connectionStatus,  // 'valid' | 'invalid' | null
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({ sourceX: fromX, sourceY: fromY, ... })

  return (
    <path
      d={path}
      style={{
        stroke: connectionStatus === 'valid' ? '#22c55e' : '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      }}
    />
  )
}

<ReactFlow connectionLineComponent={CustomConnectionLine} />
```

**FlowMat 적용:** 연결 드래그 중 유효/무효 여부를 색상으로 즉시 피드백.

**구현 복잡도**: 낮음

---

### 3.13 ConnectionMode — Loose 모드

```tsx
<ReactFlow connectionMode={ConnectionMode.Loose} />
```

- **Strict** (기본): source → target Handle만 연결 가능
- **Loose**: source → source도 가능, 더 유연한 다이어그램

**FlowMat 참고:** I/O 포트 방향(input/output)을 엄격하게 강제할지 여부 결정.

---

### 3.14 useOnViewportChange — 뷰포트 변경 감지

```tsx
useOnViewportChange({
  onEnd: (viewport) => {
    // 워크플로우별 뷰포트 저장
    localStorage.setItem(`viewport-${workflowId}`, JSON.stringify(viewport))
  }
})
```

**FlowMat 적용:** 워크플로우를 다시 열었을 때 이전 뷰포트(위치/줌) 복원.

**구현 복잡도**: 낮음

---

### 3.15 실험적 미들웨어 시스템 (v12+)

**파일**: `packages/react/src/hooks/useOnNodesChangeMiddleware.ts`

```tsx
// 노드 변경사항 가로채기
experimental_useOnNodesChangeMiddleware((changes) => {
  // 특정 노드는 이동 불가능하게 제한
  return changes.map(change => {
    if (change.type === 'position' && lockedNodeIds.includes(change.id)) {
      return null  // 변경 취소
    }
    return change
  }).filter(Boolean)
})
```

**구현 복잡도**: 중간

---

## 4. Sub-flows (노드 그룹화)

**파일**: `packages/react/src/store/index.ts`, `packages/system/src/utils/graph.ts`

```tsx
// 그룹 노드
const groupNode: Node = {
  id: 'group-1',
  type: 'group',  // 커스텀 그룹 컴포넌트 필요
  position: { x: 100, y: 100 },
  style: { width: 400, height: 300, background: '#f0f0f0' },
  data: {},
}

// 자식 노드 — position은 부모 내 상대 좌표
const childNode: Node = {
  id: 'child-1',
  parentId: 'group-1',
  position: { x: 50, y: 50 },  // 부모 기준 상대 위치
  data: {},
}
```

내부 동작:
- `parentLookup: Map<string, InternalNode[]>`로 계층 관리
- `evaluateAbsolutePosition()`으로 절대 위치 계산
- 부모 이동 시 자식 자동으로 따라감
- `extent: 'parent'`로 자식이 부모 밖으로 못 나가게 제한 가능

**FlowMat 적용:**

```
workflow → group(서브라인) → process(공정 노드)
```

여러 공정을 하나의 그룹으로 묶어 "서브라인" 또는 "단계"로 표현.  
단, GroupNode 컴포넌트는 자체 구현 필요.

**구현 복잡도**: 높음

---

## 5. Auto-layout (Dagre 연동)

**파일**: `examples/react/src/examples/Layouting/index.tsx`

```tsx
import dagre from '@dagrejs/dagre'

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

function applyLayout(direction: 'LR' | 'TB') {
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {
      width: node.measured?.width ?? 160,
      height: node.measured?.height ?? 80,
    })
  })

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map(node => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: { x, y },
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    }
  })

  setNodes(layoutedNodes)
  setTimeout(() => reactFlow.fitView({ padding: 0.1 }), 0)
}
```

**FlowMat 적용:**

```tsx
// Top Bar에 자동 정렬 버튼 추가
<button onClick={() => applyLayout('TB')}>↓ 세로 정렬</button>
<button onClick={() => applyLayout('LR')}>→ 가로 정렬</button>
```

라이브러리: `npm install @dagrejs/dagre`  
`node.measured` 필드를 써야 실제 렌더링된 크기 기준으로 정렬됨.

**구현 복잡도**: 중간

---

## 6. Floating Edges (Handle 없는 연결)

**파일**: `examples/react/src/examples/FloatingEdges/FloatingEdge.tsx`

노드 경계의 가장 가까운 점에서 자동으로 연결선이 나오는 방식.

```tsx
function FloatingEdge({ source, target }: EdgeProps) {
  const { sourceNode, targetNode } = useStore(s => ({
    sourceNode: s.nodeLookup.get(source),
    targetNode: s.nodeLookup.get(target),
  }))

  const { sx, sy, tx, ty, sourcePos, targetPos } =
    getEdgeParams(sourceNode, targetNode)  // 노드 경계 교점 계산

  const [path] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: sourcePos,
    targetX: tx, targetY: ty, targetPosition: targetPos,
  })

  return <BaseEdge path={path} />
}
```

**구현 복잡도**: 중간

---

## 7. Add Node on Edge Drop

**파일**: `examples/react/src/examples/AddNodeOnEdgeDrop/index.tsx`

연결 드래그를 빈 캔버스에 놓으면 자동으로 새 노드 생성:

```tsx
function handleConnectEnd(event) {
  const targetIsPane = event.target?.classList?.contains('react-flow__pane')

  if (targetIsPane) {
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    // NodePickerPopup 표시 → 노드 타입 선택 → 생성
    openNodePicker({ position, fromHandle: connectingHandle.current })
  }
}
```

**FlowMat 현황:** 이미 `NodePickerPopup.tsx`와 `createNodeFromConnectionDrop()`으로 구현되어 있음 ✅

---

## 8. 성능 최적화

### 8.1 onlyRenderVisibleElements

```tsx
<ReactFlow onlyRenderVisibleElements={true} />
```

**파일**: `packages/react/src/container/NodeRenderer/index.tsx`

내부 구현:
```ts
function useVisibleNodeIds(onlyRenderVisible: boolean) {
  return useStore(s =>
    onlyRenderVisible
      ? getNodesInside(s.nodeLookup, viewport, s.transform, true).map(n => n.id)
      : Array.from(s.nodeLookup.keys())
  )
}
```

**적용 기준:** 노드가 50개 이상이거나 성능 이슈가 생길 때 활성화.

### 8.2 NodeWrapper 메모이제이션

NodeRenderer는 전체를 리렌더하지 않고  
각 NodeWrapper가 자신의 노드 데이터만 구독하는 구조여서  
노드가 100개여도 1개만 바뀌면 1개만 리렌더된다.

**FlowMat 참고:** `CanvasNode.tsx`에 `React.memo`와 selector 최적화 적용 권장.

---

## 9. useReactFlow 인스턴스 API 전체

**파일**: `packages/react/src/hooks/useReactFlow.ts`

FlowMat에서 미활용 중인 유용한 메서드들:

```tsx
const rf = useReactFlow()

// 노드 쿼리
rf.getIncomers(node)           // 들어오는 연결의 소스 노드들
rf.getOutgoers(node)           // 나가는 연결의 타겟 노드들
rf.getConnectedEdges(nodes)    // 연결된 모든 엣지
rf.getIntersectingNodes(node)  // 겹치는 노드들
rf.isNodeIntersecting(node, area)

// 뷰포트 제어
rf.fitView({ padding: 0.2, duration: 300 })
rf.fitBounds(bounds)
rf.zoomIn({ duration: 300 })
rf.zoomOut({ duration: 300 })
rf.getViewport()

// 좌표 변환
rf.screenToFlowPosition({ x, y })  // 화면 좌표 → Flow 좌표
rf.flowToScreenPosition({ x, y })  // Flow 좌표 → 화면 좌표

// Handle 쿼리
rf.getHandleConnections({ nodeId, type: 'source', id: 'port-id' })
rf.getNodeConnections({ nodeId, handleType: 'target' })
```

---

## 10. 이벤트 목록 (미활용 중인 것들)

**파일**: `packages/react/src/types/component-props.ts`

FlowMat에서 활용 가능한 미사용 이벤트:

| 이벤트 | 활용 방안 |
|---|---|
| `onNodeDoubleClick` | 인라인 편집 진입 (현재 커스텀 구현 중) |
| `onNodeContextMenu` | 우클릭 컨텍스트 메뉴 |
| `onEdgeDoubleClick` | 엣지 라벨 편집 |
| `onEdgeContextMenu` | 엣지 우클릭 메뉴 |
| `onPaneContextMenu` | 빈 캔버스 우클릭 (노드 추가 메뉴) |
| `onReconnect` | 엣지 끝점 재연결 |
| `onReconnectStart/End` | 재연결 시작/종료 |
| `onSelectionContextMenu` | 다중 선택 우클릭 메뉴 |
| `onMoveEnd` | 팬/줌 완료 후 뷰포트 저장 |
| `onNodesDelete` | 삭제 후 후처리 |

---

## 11. 종합 우선순위 테이블

### 즉시 적용 가능 (낮은 복잡도, prop/컴포넌트 추가 수준)

| 기능 | 방법 | 우선순위 |
|---|---|---|
| Snap to Grid | `snapToGrid`, `snapGrid` props | ★★★ |
| NodeToolbar (삭제/복제 버튼) | `<NodeToolbar>` 컴포넌트 | ★★★ |
| EdgeToolbar (삭제 버튼) | `<EdgeToolbar>` 컴포넌트 | ★★★ |
| onBeforeDelete (삭제 확인) | `onBeforeDelete` prop | ★★★ |
| Edge 라우팅 다양화 | `getSmoothStepPath` 등 | ★★☆ |
| Edge Markers (화살표) | `markerEnd` prop | ★★☆ |
| CustomConnectionLine | `connectionLineComponent` prop | ★★☆ |
| MiniMap | `<MiniMap>` 컴포넌트 | ★★☆ |
| useUpdateNodeInternals | 포트 변경 후 갱신 훅 | ★★☆ |
| useOnViewportChange → 뷰포트 저장 | `useOnViewportChange` | ★☆☆ |
| useConnection → 연결 중 피드백 | `useConnection` | ★☆☆ |
| ColorMode (다크모드) | `colorMode` prop | ★☆☆ |

### 추가 작업 필요 (중간 복잡도)

| 기능 | 방법 | 우선순위 |
|---|---|---|
| Auto-layout (Dagre) | `@dagrejs/dagre` + `useReactFlow().fitView` | ★★★ |
| useNodesState 전환 | 상태 흐름 리팩터링 | ★★☆ |
| 미들웨어로 노드 이동 제약 | `experimental_useOnNodesChangeMiddleware` | ★★☆ |
| Floating Edges | 커스텀 엣지 + `getEdgeParams` | ★☆☆ |
| onlyRenderVisibleElements | 성능 필요 시 활성화 | ★☆☆ |

### 설계 변경 필요 (높은 복잡도)

| 기능 | 방법 | 우선순위 |
|---|---|---|
| Sub-flows (노드 그룹화) | `parentId` + 커스텀 GroupNode | ★★☆ |
| Edge Reconnect | `onReconnect` + 서버 업데이트 | ★☆☆ |

---

## 12. 현재 FlowMat에서 이미 구현된 기능 (중복 방지)

- 커스텀 노드 `CanvasNode.tsx` ✅
- 커스텀 엣지 `CanvasEdge.tsx` ✅
- 커스텀 핸들 (process_io 기반) ✅
- NodeResizer ✅
- pan / zoom ✅
- Undo / Redo (`commandHistory.ts` 자체 구현) ✅
- 연결 드래그 ✅
- 노드 선택 ✅
- Edge drop → NodePickerPopup ✅
- Edge on edge insert ✅
- Drag & Drop from palette ✅
- Background ✅
- Controls ✅
