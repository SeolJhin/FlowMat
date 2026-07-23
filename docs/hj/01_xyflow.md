# xyflow-local 분석

## 1. 레포 개요

- `xyflow-local`은 `@xyflow/react`를 사용한 매우 작은 React Flow 예제 앱이다.
- 실제 화면 조립은 `xyflow-local/src/App.tsx`에 집중되어 있고, 초기 노드/엣지 데이터는 `xyflow-local/src/nodes/index.ts`, `xyflow-local/src/edges/index.ts`에 분리되어 있다.
- 커스텀 노드 예시는 `xyflow-local/src/nodes/PositionLoggerNode.tsx`에서 확인된다.

## 2. 로컬 구동 결과

- 확인된 구동 명령은 `xyflow-local/package.json`의 `npm run dev`이다.
- `xyflow-local/README.md`에도 `npm run dev` 절차가 적혀 있다.
- 사용자 수동 테스트 기준 로컬 구동과 브라우저 화면 확인은 성공이다.
- Codex 검수 단계에서는 dev 서버를 재실행하지 않았고, 코드 구조와 파일 경로만 확인했다.

## 3. 핵심 기능

- `xyflow-local/src/App.tsx`에서 `ReactFlow`를 마운트하고 `useNodesState`, `useEdgesState`로 로컬 상태를 관리한다.
- `xyflow-local/src/nodes/index.ts`에 기본 노드와 커스텀 노드 타입 매핑이 있다.
- `xyflow-local/src/edges/index.ts`에 기본 엣지 데이터가 있다.
- `xyflow-local/src/App.tsx`의 `onConnect`에서 `addEdge()`로 새 엣지를 추가한다.
- 줌/팬/미니맵/컨트롤은 `ReactFlow`와 `@xyflow/react` 기본 기능을 그대로 사용한다.

## 4. 테스트 결과

- 사용자 수동 테스트 기준 로컬 구동과 화면 확인은 완료된 상태다.
- Codex 검수 단계에서는 자동 테스트를 실행하지 않았고, 브라우저 재실행도 수행하지 않았다.
- 검수 범위는 실제 소스 파일 경로와 호출 관계를 확인하는 정적 문서 검수다.

## 5. 주요 파일 구조

- `xyflow-local/src/main.tsx`: React 앱 진입점
- `xyflow-local/src/App.tsx`: `ReactFlow` 캔버스 조립, 노드/엣지 상태 연결, `onConnect` 처리
- `xyflow-local/src/nodes/index.ts`: 초기 노드 목록과 `nodeTypes` 매핑
- `xyflow-local/src/nodes/PositionLoggerNode.tsx`: 좌표를 표시하는 커스텀 노드 컴포넌트
- `xyflow-local/src/nodes/types.ts`: 커스텀 노드 데이터 타입 정의
- `xyflow-local/src/edges/index.ts`: 초기 엣지 목록
- `xyflow-local/src/index.css`: 예제 앱 로컬 스타일

## 6. 기능별 구현 위치

- 도형/노드 생성: `xyflow-local/src/nodes/index.ts`에서 초기 노드를 정의하고, `xyflow-local/src/App.tsx`에서 이를 `ReactFlow`에 주입한다. 커스텀 노드 UI는 `xyflow-local/src/nodes/PositionLoggerNode.tsx`에 있다.
- 선/엣지/화살표 생성: 초기 엣지는 `xyflow-local/src/edges/index.ts`에 있고, 사용자 연결에 따른 새 엣지 생성은 `xyflow-local/src/App.tsx`의 `onConnect`와 `addEdge()` 호출에서 처리된다.
- 드래그/이동: 레포 내부 별도 드래그 알고리즘 구현은 확인하지 못했다. `xyflow-local/src/App.tsx`에서 `onNodesChange`를 `ReactFlow`에 연결하고, 실제 드래그 동작 세부는 `@xyflow/react` 내부 구현에 위임된다.
- 줌/팬: 레포 내부 별도 구현은 없고, `xyflow-local/src/App.tsx`에서 `fitView`, `<Controls />`, `<MiniMap />`, `<Background />`를 설정한다. 실제 줌/팬 동작 세부는 `@xyflow/react` 내부 구현에 위임된다.
- 상태 관리: `xyflow-local/src/App.tsx`의 `useNodesState(initialNodes)`, `useEdgesState(initialEdges)`가 핵심이다.
- 스타일 관련 파일: `xyflow-local/src/index.css`, 그리고 `xyflow-local/src/App.tsx`에서 import 하는 `@xyflow/react/dist/style.css`

## 7. Flow Mat 적용 가능성

- 여섯 개 레포 중에서 Flow Mat의 노드/엣지 중심 화면에 가장 직접적으로 대응되는 참고 예제다.
- 노드 목록, 엣지 목록, `onConnect`, 커스텀 노드 등록 방식이 작고 단순해서 초기 이식 실험에 적합하다.
- 특히 `xyflow-local/src/App.tsx` 구조는 Flow Mat에서 최소 기능 캔버스를 빠르게 재현할 때 참고 가치가 높다.

## 8. 이식 시 주의사항

- 이 레포는 기능이 단순한 예제라서 복잡한 히스토리, 협업, 고급 선택/정렬 로직은 제공하지 않는다.
- 드래그/줌/팬의 세부 구현은 라이브러리 내부에 있으므로, Flow Mat에서 라이브러리 바깥의 커스텀 상호작용이 많다면 추가 설계가 필요하다.
- 현재 예제는 초기 데이터가 코드에 하드코딩되어 있어 서버 저장, 권한, 협업 구조 참고용으로는 부족하다.

## 9. 미확인/추가 확인 필요 사항

- 노드 추가 UI가 별도 버튼/툴바로 제공되는지는 레포 내부에서 확인되지 않았다. 현재 확인된 것은 코드에 선언된 초기 노드와 엣지 연결 동작이다.
- 고급 편집 기능이나 저장 기능은 예제 코드 기준으로 확인되지 않았고 `추가 확인 필요`다.

## 10. 중간 결론

- `xyflow-local`은 Flow Mat의 기본 노드/엣지 캔버스 구조를 검토할 때 가장 간단하고 직접적인 레퍼런스다.
- 반대로 협업, 영속화, 고급 편집기 기능까지 참고하려면 다른 레포와 함께 봐야 한다.
