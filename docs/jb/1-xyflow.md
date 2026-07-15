# xyflow/xyflow (React Flow)

- **주소**: https://github.com/xyflow/xyflow
- **인기도**: 약 3.7만 Star, 2.4천 Fork
- **라이선스**: MIT (완전 무료, 상업적 이용 제한 없음)
- **주요 언어**: TypeScript

## 한 줄 정의
> **노드(Node)-엣지(Edge) 기반 UI**를 만들기 위한 라이브러리. 여기서 "노드"는 캔버스 위의 박스(도형) 하나, "엣지"는 노드와 노드를 잇는 선(연결선)을 뜻합니다.

## 무엇을 제공하나
React용 `@xyflow/react`(구 React Flow)와 Svelte용 `@xyflow/svelte` 두 패키지가 들어있는 모노레포(하나의 저장소 안에 여러 패키지를 같이 관리하는 구조)입니다. 흐름도, 워크플로우 빌더, 파이프라인 편집기처럼 **"박스 + 연결선"** 구조를 그리는 화면을 만들 때 쓰는 도구입니다.

## 핵심 개념
- **Node**: `{ id, position: {x, y}, data }` 형태의 JS 객체 하나가 캔버스 위 박스 하나. `data`에 원하는 내용(제목, 상태 등)을 자유롭게 넣을 수 있습니다.
- **Edge**: `{ id, source, target }` 형태로 어느 노드에서 어느 노드로 연결되는지를 나타냅니다.
- **Handle**: 노드에 있는 "연결 시작/끝 지점"(커넥터 점)입니다. 하나의 노드에 여러 개의 handle을 둘 수 있어서, "이 노드의 A번 출력 → 저 노드의 B번 입력" 같은 세밀한 연결이 가능합니다.
- **onConnect / onNodesChange / onEdgesChange**: 사용자가 드래그로 연결하거나 노드를 옮길 때 호출되는 콜백 함수들. 여기서 상태(데이터)를 갱신해서 화면에 반영합니다.

## 설치 및 기본 사용
```
npm install @xyflow/react
```

```jsx
import { ReactFlow, useNodesState, useEdgesState, addEdge } from '@xyflow/react';

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = (params) => setEdges((eds) => addEdge(params, eds));

  return (
    <ReactFlow nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} />
  );
}
```

## 협업(실시간 동시 편집) 지원 여부
기본 제공하지 않습니다. 여러 사람이 동시에 같은 캔버스를 편집하는 기능이 필요하면 Yjs 같은 별도의 동기화 라이브러리를 직접 연결해야 합니다.

## 상업적 이용
MIT 라이선스라 무료로 상업 서비스에 써도 됩니다. 다만 미니맵, 자동 정렬 같은 고급 기능 일부는 유료 "React Flow Pro" 상품으로 별도 제공됩니다.
