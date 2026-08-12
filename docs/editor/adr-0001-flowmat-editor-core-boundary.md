# ADR-0001: FlowMat Editor Core Boundary

작성일: 2026-08-12

## 상태

Accepted

## 배경

FlowMat workspace는 현재 React Flow 기반으로 process node와 connection을 렌더링한다. Annotation도 React Flow node로 등록되어 있어서, 자유 도형 편집 기능을 확장할수록 React Flow의 node, viewport, selection, resize 동작에 강하게 묶인다.

목표는 기존 workflow canvas를 깨지 않고, PPT/Figma 형태의 자유 도형 편집 기능을 별도 engine으로 점진 구축하는 것이다.

## 결정

`flowmat_frontend/src/lib/flowmat-editor/` 아래에 순수 TypeScript editor core를 둔다.

core는 다음을 소유한다.

- `EditorDocument`
- `EditorElement`
- geometry primitives
- camera
- selection
- tool state
- history transaction
- renderer-independent command

core는 다음을 import하지 않는다.

- React
- React DOM
- `@xyflow/react`
- Zustand
- axios
- React Query
- workflow API
- STOMP
- `html-to-image`
- Konva
- Pixi

## 저장 범위 결정

저장 기능은 두 범위로 분리한다.

1. Core document persistence
   - 새 `EditorDocument`의 JSON 직렬화와 역직렬화를 검증한다.
   - rectangle, ellipse, polygon/triangle, line 같은 새 element 모델을 포함할 수 있다.

2. Legacy annotation adapter persistence
   - 기존 backend annotation API와 호환되는 범위만 저장한다.
   - 초기 parity 범위는 `rectangle`, `ellipse`, `diamond`, `freehand`, `text`다.
   - triangle과 line은 backend schema 결정 전까지 기존 annotation API에 억지 매핑하지 않는다.

## 이유

현재 백엔드 annotation enum은 `SHAPE`, `FREEHAND`, `TEXT`이고, shape kind는 `RECTANGLE`, `ELLIPSE`, `DIAMOND`만 허용한다. triangle과 line을 기존 API에 맞추려면 의미를 숨긴 저장 포맷이 필요해진다. 이는 호환성과 데이터 해석 비용을 키운다.

따라서 core는 미래 모델을 올바르게 표현하고, legacy adapter는 기존 기능 parity만 담당하도록 경계를 둔다.

## 결과

- 새 editor core는 React Flow 제거 여부와 무관하게 발전할 수 있다.
- 기존 workflow canvas는 안정적으로 유지된다.
- backend schema 변경 여부는 별도 ADR에서 결정한다.
- triangle/line UI는 core demo에서는 가능하지만, 운영 저장 연동은 persistence 결정 이후 진행한다.

## 검증 기준

- core production code에서 금지 import가 없어야 한다.
- `EditorDocument`와 geometry는 Node 환경 unit test로 검증되어야 한다.
- 기존 workspace 화면은 이 ADR만으로 변경되지 않아야 한다.
