# FlowMat 워크플로우 캔버스 — 라이브러리 선택 분석

## 1. 먼저 확인한 것: FlowMat 문서 자체가 답을 갖고 있었음

업로드해주신 `redhorse.zip` 안의 FlowMat 문서 폴더(`FlowMat/docs/`)를 열어보니, 이미 캔버스 설계 문서 3개(`canvas_component_contracts.md`, `workflow_canvas_state_machine.md`, `frontend_mvp_architecture.md`)가 만들어져 있었습니다. 그리고 그 안에 결정적인 내용이 있었습니다.

- `frontend_mvp_architecture.md`에 기술 스택으로 **"React Flow"**가 명시되어 있음
- 컴포넌트 이름 자체가 React Flow(=xyflow) 용어 그대로 사용됨: `CanvasViewport`, `onNodeDragEnd`, `onConnectStart`, `sourceHandle` / `targetHandle`
- `workflow_canvas_state_machine.md`에는 "**React Flow reconnection**이 결정적으로 동작하도록 handle id를 고정한다"는 규칙까지 적혀 있음
- 같은 문서에 "**no collaborative editing first**" (협업 편집은 1차 범위 아님)라는 문장이 명시됨

즉, **이미 팀 내부적으로 xyflow(React Flow)를 쓰기로 설계가 끝난 상태**였습니다. 아래 분석은 이 결정이 왜 타당한지, 그리고 나머지 5개 저장소가 왜 후보에서 제외되는지를 검증하는 내용입니다.

## 2. FlowMat 캔버스가 실제로 다뤄야 하는 데이터

`canvas_component_contracts.md` 기준으로 캔버스는 다음을 그려야 합니다.

- **노드** = 공정(Process): `processId`, `posX`, `posY`, `width`, `height`, `colorScheme` 등
- **포트** = 공정의 입출력(ProcessIo): 방향(input/output), 수량, 단위, 수식(formula) 등을 가진 행 단위 데이터
- **엣지** = 공정 간 연결(ProcessConnection): `fromProcessId` → `toProcessId`, 유량(flowRate), 지연시간(delayTimeSec), 손실률(lossRate) 등 제조 도메인 특유의 속성

이건 "자유롭게 그림을 그리는" 화이트보드가 아니라, **REST API의 구조화된 DTO를 노드/엣지/핸들로 정확히 매핑해야 하는 작업**입니다.

## 3. 6개 저장소를 두 그룹으로 나누면

| 그룹 | 저장소 | 성격 |
|---|---|---|
| 노드-엣지 그래프 엔진 | **xyflow** | 박스+연결선, 데이터 기반 렌더링에 특화 |
| 자유형 드로잉 캔버스 | tldraw, tldraw-sync-cloudflare, excalidraw, instldraw | 손그림/도형 중심, 협업 화이트보드 지향 |
| 실시간 동시편집 엔진 | yjs | 그리기 기능 없음, 데이터 동기화만 담당 |

FlowMat이 필요한 건 "박스와 화살표를 손으로 자유롭게 그리는 도구"가 아니라 **"서버 데이터를 정확히 시각화하고, 사용자 조작을 다시 REST 요청으로 변환하는 도구"**입니다. 이 조건에서는 그룹 1(xyflow)만 맞고, 그룹 2(tldraw 계열, excalidraw)는 도형 데이터 모델이 달라서 억지로 끼워 맞춰야 합니다.

## 4. 결론: xyflow(React Flow) 채택 권장

**이유**
1. FlowMat 문서가 이미 React Flow 용어(handle, viewport, onConnect)로 설계돼 있어, 지금 xyflow를 선택하면 문서와 코드가 그대로 일치합니다.
2. MIT 라이선스라 상업 서비스(FlowMat SaaS)에 라이선스 비용 없이 쓸 수 있습니다. (tldraw는 프로덕션 배포 시 라이선스 키가 필요해서 이 조건에 안 맞습니다.)
3. 노드에 원하는 데이터(`data` 필드)를 자유롭게 넣을 수 있어서, `CanvasNodeViewModel`처럼 이미 설계된 View Model 구조를 그대로 얹기 쉽습니다.
4. `onNodesChange`, `onConnect` 같은 콜백이 `workflow_canvas_state_machine.md`에 정의된 `canvasMode` 상태 머신(idle → dragging_node → submitting_mutation 등)과 자연스럽게 맞물립니다.

**지금 당장 필요 없는 것**
- **Yjs**: 문서에 "협업 편집은 1차 범위 아님"이라고 명시돼 있어 MVP에서는 불필요합니다. 다만 나중에 "여러 팀원이 동시에 같은 워크플로우를 편집"하는 기능을 추가하게 되면, 그때 xyflow(화면) + Yjs(동시 편집 병합) 조합을 검토하면 됩니다. 지금 미리 넣으면 복잡도만 늘어납니다.
- **tldraw / tldraw-sync-cloudflare / excalidraw / instldraw**: 자유 드로잉·화이트보드 특화 라이브러리라, 구조화된 제조 도메인 데이터(공정-포트-연결)를 다루는 FlowMat 캔버스와는 데이터 모델이 맞지 않습니다. 참고 자료로만 남겨두면 충분합니다.

## 5. 다음 단계 제안
문서 자체에서도 다음 문서로 `workspace_rest_api_playbook`을 권장하고 있으니, xyflow 설치 후에는 `toWorkflowCanvasViewModel` 변환 함수부터 구현해서 `WorkflowCanvasResponse` → `nodes`/`edges` 배열로 바꾸는 작업을 먼저 진행하시면 됩니다.
