# tldraw 분석

## 1. 레포 개요

- `tldraw`는 단일 앱이 아니라 화이트보드 엔진, UI, 스토어, 예제 앱이 함께 있는 대형 모노레포다.
- 개발용 예제 앱 진입은 `tldraw/apps/examples` 쪽에 있고, 핵심 편집기 로직은 `tldraw/packages/tldraw`, `tldraw/packages/editor`, `tldraw/packages/store`에 분산되어 있다.
- Flow Mat 관점에서는 예제 앱보다도 툴 상태 머신, 셰이프 도구, 에디터 상태, 스토어 구조를 보는 편이 더 중요하다.

## 2. 로컬 구동 결과

- 확인된 구동 명령은 `tldraw/README.md`와 `tldraw/package.json` 기준 `yarn dev`다.
- `tldraw/README.md`에는 개발 서버가 `localhost:5420`에서 examples 앱을 실행한다고 적혀 있다.
- 사용자 수동 테스트 기준 로컬 구동과 브라우저 화면 확인은 성공이다.
- Codex 검수 단계에서는 dev 서버를 재실행하지 않았고, 코드 구조와 파일 경로만 확인했다.

## 3. 핵심 기능

- 도형 도구, 선 도구, 화살표 도구, 선택 도구, 손 도구, 줌 도구가 각각 별도 파일과 상태 머신으로 분리되어 있다.
- 편집기 중심 상태는 `tldraw/packages/editor/src/lib/editor/Editor.ts`에 모여 있고, 레코드 저장소는 `tldraw/packages/store/src/lib/Store.ts`에서 관리된다.
- UI 레이어와 캔버스 엔진이 완전히 분리된 구조는 아니며, `packages/tldraw` 안에서 기본 툴/셰이프/UI가 한 세트로 엮여 있다.

## 4. 테스트 결과

- 사용자 수동 테스트 기준 examples 앱 구동과 화면 확인은 완료된 상태다.
- Codex 검수 단계에서는 자동 테스트를 실행하지 않았고, examples 앱 브라우저 재실행도 수행하지 않았다.
- 검수 범위는 실제 파일 경로와 역할을 확인하는 정적 검수다.

## 5. 주요 파일 구조

- `tldraw/apps/examples/package.json`: examples 앱 실행 스크립트
- `tldraw/packages/tldraw/src/lib/Tldraw.tsx`: `Tldraw` 컴포넌트 진입점
- `tldraw/packages/tldraw/src/lib/defaultTools.ts`: 기본 도구 등록
- `tldraw/packages/tldraw/src/lib/shapes/geo/GeoShapeTool.ts`: 기하 도형 툴 정의
- `tldraw/packages/tldraw/src/lib/shapes/line/LineShapeTool.ts`: 선 툴 정의
- `tldraw/packages/tldraw/src/lib/shapes/arrow/ArrowShapeTool.ts`: 화살표 툴 정의
- `tldraw/packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts`: 선택 객체 이동 처리
- `tldraw/packages/tldraw/src/lib/tools/HandTool/childStates/Dragging.ts`: 카메라 팬 처리
- `tldraw/packages/tldraw/src/lib/tools/ZoomTool/ZoomTool.ts`: 줌 툴 진입점
- `tldraw/packages/editor/src/lib/editor/Editor.ts`: 에디터 상태와 카메라/줌 API
- `tldraw/packages/store/src/lib/Store.ts`: 레코드 스토어와 변경 추적
- `tldraw/packages/editor/editor.css`: 에디터 스타일
- `tldraw/packages/tldraw/src/lib/ui.css`: 기본 UI 스타일

## 6. 기능별 구현 위치

- 도형/노드 생성: `tldraw/packages/tldraw/src/lib/shapes/geo/GeoShapeTool.ts`, `tldraw/packages/tldraw/src/lib/shapes/geo/toolStates/Pointing.ts`에서 기하 도형 생성 흐름을 처리한다.
- 선/엣지/화살표 생성: 선은 `tldraw/packages/tldraw/src/lib/shapes/line/LineShapeTool.ts`, `tldraw/packages/tldraw/src/lib/shapes/line/toolStates/Pointing.ts`에 있다. 화살표는 `tldraw/packages/tldraw/src/lib/shapes/arrow/ArrowShapeTool.ts`, `tldraw/packages/tldraw/src/lib/shapes/arrow/toolStates/Pointing.tsx`에 있다.
- 드래그/이동: 선택된 도형 이동은 `tldraw/packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts`에 있다.
- 줌/팬: 팬은 `tldraw/packages/tldraw/src/lib/tools/HandTool/childStates/Dragging.ts`, 줌 도구는 `tldraw/packages/tldraw/src/lib/tools/ZoomTool/ZoomTool.ts`와 `tldraw/packages/tldraw/src/lib/tools/ZoomTool/childStates/*`에 있다. 카메라와 줌 API 자체는 `tldraw/packages/editor/src/lib/editor/Editor.ts`에서 제공된다.
- 상태 관리: 에디터 중심 상태는 `tldraw/packages/editor/src/lib/editor/Editor.ts`, 저장소와 변경 추적은 `tldraw/packages/store/src/lib/Store.ts`가 담당한다.
- 스타일 관련 파일: `tldraw/packages/editor/editor.css`, `tldraw/packages/tldraw/src/lib/ui.css`

## 7. Flow Mat 적용 가능성

- Flow Mat를 단순 노드 에디터가 아니라 화이트보드형 편집기로 확장하려는 경우에는 매우 강한 참고 대상이다.
- 반대로 Flow Mat가 구조화된 노드/엣지 편집이 중심이라면, 이 레포는 엔진 규모와 추상화 수준이 상당히 커서 직접 이식 대상이라기보다 설계 참고용에 가깝다.
- 툴 상태 머신, 카메라 제어, 선택/이동 로직을 깊게 참고하려면 가치가 높다.

## 8. 이식 시 주의사항

- 파일 구조가 넓고 깊어서 필요한 기능만 떼어 오기 어렵다.
- `Editor`와 `Store`, 각종 툴/셰이프 유틸이 강하게 연결되어 있어 부분 이식 난도가 높다.
- 데이터 모델이 Flow Mat의 도메인 노드/엣지 모델과 다를 가능성이 높으므로, API 표면만 보고 옮기면 오히려 복잡도가 증가할 수 있다.
- UI와 엔진이 완전히 분리된 경량 SDK라고 보기 어렵다.

## 9. 미확인/추가 확인 필요 사항

- Flow Mat에서 실제로 필요한 기능 범위가 자유형 드로잉인지 구조화된 플로우 편집인지에 따라 참고 우선순위가 크게 달라진다. 이 판단은 `추가 확인 필요`다.
- 협업, 저장, 백엔드 연동은 이 문서에서 깊게 다루지 않았고 `추가 확인 필요`다.

## 10. 중간 결론

- `tldraw`는 완성도 높은 화이트보드 엔진 구조를 보여 주지만, Flow Mat에 바로 이식하기에는 규모가 크다.
- 로직을 통째로 가져오기보다 도구 상태 머신, 카메라 처리, 에디터/스토어 분리 방식을 선택적으로 참고하는 편이 현실적이다.
