# FlowMat Workflow Canvas — Prototype

FlowMat의 워크플로우 캔버스 화면을 xyflow(React Flow) 기반으로 만든 로컬 프로토타입입니다.
`docs/jb/`, `docs/hj/` 라이브러리 분석 결과와 `docs/canvas_component_contracts.md`,
`docs/workflow_canvas_state_machine.md`의 규칙을 그대로 반영해서 만들었습니다.

## 실행 방법

```bash
npm install
npm run dev
```

터미널에 뜨는 주소(기본 `http://localhost:5173`)로 접속하면 됩니다.

프로덕션 빌드를 확인하고 싶으면:

```bash
npm run build
npm run preview
```

## 무엇이 들어있나

샘플 데이터는 "원자재 입고 → CNC 가공 → 품질 검사 → 완제품 출고" 4개 공정으로 구성된
가상의 생산 흐름입니다. 실제 FlowMat 백엔드의 `WorkflowCanvasResponse` DTO와 완전히 같은
필드 구조(`processId`, `posX/posY`, `flowRate`, `delayTimeSec` 등)를 그대로 사용했기 때문에,
나중에 실제 API 응답으로 그대로 교체할 수 있습니다.

- 노드를 드래그해서 옮길 수 있습니다 (놓는 순간 콘솔에 위치가 찍히는데, 이 지점이 실제
  서비스에서 `useUpdateProcess` 같은 mutation을 호출할 자리입니다)
- 포트(입/출력)를 드래그해서 새 연결선을 만들 수 있습니다
- 노드를 클릭하면 오른쪽 패널에 공정 상세 + 포트 목록이 뜨고, 이름을 바로 수정할 수 있습니다
- 연결선을 클릭하면 오른쪽 패널에 유량/지연시간/손실률/우선순위가 뜨고, 유량을 수정할 수 있습니다

## 폴더 구조

`flowmat_frontend`의 `features/` 폴더 관례를 그대로 따랐습니다.

```
src/
  features/
    workflow-canvas/
      api/sampleWorkflowCanvasResponse.js   # WorkflowCanvasResponse DTO 형태의 샘플 데이터
      model/toWorkflowCanvasViewModel.js    # DTO -> ViewModel 순수 변환 함수
      ui/
        CanvasNode.jsx                      # 공정 노드 (입출력 포트 handle 포함)
        CanvasEdge.jsx                      # 연결선 (유량/지연시간 라벨)
        NodeInspector.jsx                   # 공정 상세 패널
        ConnectionInspector.jsx             # 연결 상세 패널
        WorkflowCanvasPage.jsx              # 전체 조립 + 선택 상태 관리
  App.jsx
  main.jsx
  index.css
```

## 실제 서비스로 이어붙일 때 할 일

1. `api/sampleWorkflowCanvasResponse.js`를 실제 `GET /api/workflows/{workflowId}/canvas`
   REST 호출(`useWorkflowCanvasQuery`)로 교체
2. `WorkflowCanvasPage.jsx`의 콘솔 로그 자리(`onNodeDragStop`, `onConnect`, 인스펙터의
   `onNodeNameChange`/`onFlowRateChange`)에 각각 `useUpdateProcess`,
   `useCreateProcessConnection`, `useUpdateProcessConnection` 같은 mutation hook 연결
3. 필요하면 `canvas_component_contracts.md`에 있는 `RuleDrawer`, `InspectorSelectionViewModel`
   등 아직 구현 안 한 부분 추가
