# FlowMat Editor — Connector Line + Ribbon 완성 진행 상황

작성일: 2026-08-14
관련 계획서(승인됨): `C:\Users\rjw04\.claude\plans\async-yawning-dijkstra.md`
관련 선행 문서: `docs/editor/current-state.md` (2026-08-12 기준 editor engine v1 상태)

## 전체 목표

rhwp(Rust/WASM HWP 엔진)의 도형 그리기 UX 중 FlowMat에 없던 것만 선별 이식:

1. **커넥터 라인** — 두 도형에 앵커링되어 자동으로 따라오는 선 (rhwp `ConnectorData` → FlowMat `ElementBinding`)
2. **회전된 도형 리사이즈 버그 수정** — rhwp `calcResizedBboxRotated` 기법 적용
3. **화살표 렌더링** — 이미 있던 `startArrow`/`endArrow` 필드를 실제로 그리기
4. **툴바 완성** — 이미 구현된 커맨드(Duplicate/Group/Align 등)를 리본에 배선만 하면 되는 항목들

범위 제외: React Flow의 워크플로 노드-엣지 시스템(`CanvasEdge.tsx`)은 별개 — 건드리지 않음. rhwp의 4단 메뉴바/153개 명령/9종 라인타입은 이식 대상 아님(과거 조사에서 이미 결론).

백엔드는 원래 계획상 "변경 불필요"였으나, 실제 라이브 검증 중 백엔드 버그 2건을 발견해 함께 수정함 (아래 참고).

## 완료됨

### 1. Phase 0–4 구현 (이전 세션, 코드 작성 완료)

- **데이터 모델**: `LineElement`에 `startBinding`/`endBinding` 옵셔널 필드 추가 (`EditorElement.ts`), `AnchorSide`/`ElementBinding` 타입 신설
- **기하 유틸**: `geometry/AnchorPoints.ts` 신규 — `getAnchorPoint`, `getNearestAnchor`, `findNearestAnchor` (회전 고려, 마그넷 스냅 임계값 14px)
- **자동 추종**: `model/ConnectorSync.ts` 신규 — `recomputeBoundLines(document, movedIds)`, move/resize/rotate 후처리로 배선 완료
- **삭제 시 처리**: `EditorDocument.ts`의 `deleteElements`에 `detachDanglingBindings` 추가 — 앵커 도형이 삭제되면 연결선은 삭제하지 않고 바인딩만 해제
- **그리기 인터랙션**: `WorkspaceEditorLayer.tsx`에 `draw-connector` 인터랙션 타입, `handlePointerDown/Move/Up` 분기, `createConnectorElement` 추가
- **화살표**: `SvgRenderer.ts`에 `CONNECTOR_ARROW_MARKER_ID`/`getLineMarkerAttrs`, `SvgEditorSurface.tsx`에 `<ArrowMarkerDefs>` 및 `lineStyleAttrs` 배선
- **회전 리사이즈**: `geometry/Transform.ts`에 `resizeRotatedElementFromHandle` 추가 (단일 선택 + 회전≠0일 때 사용), `SelectionHandles`에 `rotation` prop 배선
- **툴바**: `ribbonConfig.ts`에 Arrange/Align/Navigation 그룹 추가, `WorkflowCanvasPage.tsx`의 `ribbonHandlers`에 약 17개 커맨드 배선(Duplicate/Delete/Group/Ungroup/Front/Back/Align×6/Distribute×2/Fit View/Select All 등), 구버전 중복 상단바/사이드바 UI 제거
- 신규 유닛 테스트: `AnchorPoints.test.ts`(5), `ConnectorSync.test.ts`(3), `Geometry.test.ts` 회전 리사이즈 케이스(+2), `EditorDocument.test.ts` 바인딩 해제 케이스(+1)
- `npm run build` / `tsc --noEmit` / `npm run lint` / `npm run test` 전부 통과 상태로 이 단계 마무리

### 2. 이번 세션 — 프리엑지스팅 크래시 버그 진단 및 수정

라이브 브라우저 테스트 중 워크스페이스 진입 시 **"Maximum update depth exceeded"** 크래시 발견. `git stash` 기반 이분 탐색 + 사용자의 정확한 근본 원인 진단으로 확인:

- 원인: `WorkspaceEditorLayer.tsx`에서 `backendDocument ?? createEmptyEditorDocument()`가 매 렌더마다 새 참조를 생성 → `editableIds` 참조 변경 → 선택 정리 `useEffect`가 `setSelectedIds(current => current.filter(...))`로 매번 새 배열 저장(내용이 같아도 `filter`는 항상 새 배열) → `Object.is` 바일아웃 불가 → 무한 재렌더 → React Flow `StoreUpdater`까지 흔들림
- **커넥터 작업과 무관한 프리엑지스팅 버그**(커밋 `bdb63cb4`에서 유입), 문서 조회가 pending인 동안 항상 재현 가능
- 수정:
  1. `EMPTY_BACKEND_DOCUMENT` 모듈 상수로 안정화 (매 렌더 재생성 방지)
  2. `filterStable(list, predicate)` 헬퍼 추가 — 필터링 결과가 원본과 길이가 같으면(=아무것도 제거 안 됨) 원본 배열 참조를 그대로 반환해 `setState` 바일아웃 가능하게 함
- 회귀 테스트: `WorkspaceEditorLayer.test.ts` 신규 (4 tests) — `filterStable`의 참조 안정성 검증
- **라이브 검증 완료**: 콜드 로드 후 4초 대기해도 크래시 없음, 콘솔 에러 0건 (이전엔 100% 재현되던 조건)

### 3. 이번 세션 — 백엔드 JSONB 매핑 버그 발견 및 수정

커넥터 라이브 테스트 중 **모든 editor-document 저장이 500 에러**로 실패하는 것을 발견 (`PUT /workflows/{id}/editor-document`):

- 원인: `WorkflowEditorDocument.java`의 `cameraJson`, `WorkflowEditorElement.java`의 `geometryJson`/`styleJson` 세 필드가 전부 `@Column private String`으로만 매핑되어 있고, 같은 코드베이스의 `Workflow.java`/`WorkflowTemplate.java`/`ProcessTemplate.java`가 쓰는 `@JdbcTypeCode(SqlTypes.JSON)` + `columnDefinition = "jsonb"` 패턴이 빠져 있었음
- 증상: INSERT/UPDATE 불문 **모든** workflow의 editor-document 저장이 항상 실패 — `wf_demo_main`이 이전에 한 번도 저장을 성공한 적이 없어서(=위 크래시 버그 때문에 아무도 여기까지 도달 못 함) 이제껏 미발견 상태였음
- 사용자 확인 후 수정 승인 받아 즉시 반영: 세 필드에 동일 패턴 적용
- 검증: `./gradlew compileJava` 클린, 백엔드 재시작 후 `PUT` 200 OK 확인 (재시작 과정에서 `Ctrl+C`가 `java.exe`를 완전히 죽이지 못해 8080 포트 점유 → `Get-NetTCPConnection`/`Stop-Process`로 정리 후 재기동, 사용자가 직접 수행)

### 4. 이번 세션 — 커넥터 바인딩 영속화 누락 버그 발견 및 수정

백엔드 저장이 정상화된 뒤 실제로 도형 2개 + 커넥터를 그려 저장/재로드까지 검증하던 중 발견:

- 원인: `adapters/editorDocumentBackendAdapter.ts`의 `case 'line':` 분기(저장 방향 `serializedElementToBackendInput`, 로드 방향 `backendElementToSerialized` 둘 다)가 `geometry: { start, end }`만 명시적으로 화이트리스트하고 있어 `startBinding`/`endBinding`이 저장/복원 경로 모두에서 누락됨
- 계획서의 "adapter는 임의 키를 그대로 통과시키므로 수정 불필요"라는 가정이 틀렸음이 드러남 — 이 adapter는 **필드를 하나하나 명시적으로 골라 담는 방식**이라 새 필드는 명시적으로 추가해야 함 (참고: 이 세션 초반에 `EditorDocumentSerializer.ts`라는 **별도의 로컬 export/import용 직렬화기**는 이미 바인딩을 지원하도록 고쳤었는데, 백엔드 저장에 실제로 쓰이는 이 adapter는 놓쳤던 것)
- 증상: 커넥터를 그려서 화면상으로는 도형을 따라 잘 움직이지만(메모리 내 상태는 정상), **저장 후 새로고침하면 바인딩이 사라져** 그 후로는 도형을 움직여도 연결선이 따라오지 않는 "죽은 선"이 됨
- 수정: `AnchorSide`/`ElementBinding` 타입 import 추가, 저장 시 `startBinding: element.startBinding ?? null, endBinding: element.endBinding ?? null`을 geometry에 포함, 로드 시 `readNullableBinding`/`readAnchorSide` 헬퍼 신규 작성해 복원
- 회귀 테스트 2건 추가 (`editorDocumentBackendAdapter.test.ts`): 바인딩 왕복 보존 검증, 바인딩 없는 기존 저장 데이터의 하위 호환(→ `null`) 검증
- `tsc`/`lint`/`build`/`test`(87 passing) 전부 재확인 완료

### 5. 라이브 브라우저 검증 — 완료된 항목

- 리본 Annotate 탭에 Rectangle/Ellipse/Triangle/Line/**Connector**/Text 도구, Arrange(Duplicate/Delete/Group/Ungroup/Front/Back), Align(6방향+Dist.×2+Group/Ungroup) 그룹이 실제로 렌더링됨 확인
- 사각형 도형 2개(`shape-1`, `shape-2`) 실제 생성 → 저장(PUT 200) → 새로고침 → **정상 복원 확인**
- Connector 도구로 `shape-1` 우측 앵커 → `shape-2` 좌측 앵커 드래그 → 정확히 두 앵커를 잇는 라인(`shape-3`) 생성 확인 (DOM `data-element-id` 기준 픽셀 단위로 검증)
- 커넥터 바인딩 수정 후: 저장 → 새로고침 → 3개 요소(`shape-1/2/3`) 전부 올바른 위치로 복원 확인 (바인딩 데이터 자체가 살아있는지는 "도형 이동 시 따라오는지"로 최종 검증해야 하는데, 이 단계에서 막힘 — 아래 참고)

## 해결됨 — Playwright 조작 안정성 문제 (제품 버그 아니었음)

이번 세션은 Playwright MCP를 **브라우저 확장 프로그램 브리지 모드**로 연결해서 씀(사용자가 직접 띄운 실제 Chrome 창을 원격 조작). 이 모드에서 자동화 스크립트(`page.mouse`)로 "이미 생성된 도형을 클릭+드래그로 이동"시키는 시도가 계속 반응이 없었음 — `document.elementFromPoint`는 정확히 도형을 가리키는데도 `pointerdown`/`click` 이벤트 자체가 페이지에 전혀 도달하지 않는 현상까지 확인됨(window capture-phase 리스너로도 0건 캡처).

**사용자가 직접 마우스로 같은 동작을 해보니 도형 이동 자체는 문제없이 잘 됨** → 이 세션의 자동화 도구(확장 프로그램 릴레이)가 특정 드래그 패턴에서 간헐적으로 입력을 못 전달하는 테스트 환경 문제였음을 확정, 앱 코드 문제 아님.

## 완료됨 — 커넥터 바인딩 최종 검증

새 커넥터(`shape-5`, 수정된 adapter로 저장됨: `startBinding: {elementId: "shape-1", anchor: "right"}`, `endBinding: {elementId: "shape-2", anchor: "left"}`)를 그린 뒤, 사용자가 직접 `shape-1`을 드래그로 이동 → **커넥터 선이 실시간으로 잘 따라옴을 확인** ("잘따라옴").

이로써 이번 세션의 핵심 목표(rhwp 커넥터 라인 기능의 이식 + 저장/재로드 영속화)가 엔드투엔드로 검증 완료됨. (참고: 오래된 `shape-3`는 adapter 수정 전에 저장된 데이터라 바인딩이 `null`로 굳어있어 여전히 안 따라옴 — 예상된 정상 동작이며 정리용 테스트 데이터라 무해함.)

## 남은 작업 (다음 세션 TODO)

이번 세션은 사용자 판단으로 여기서 마무리함(토큰 소진). 아래는 다음 세션에서 이어서 할 일 — 코드는 이미 다 작성되어 있고 빌드/테스트도 통과한 상태라, 전부 **라이브 브라우저 확인만 남은 상태**임.

### 1. 회전된 도형 리사이즈 라이브 테스트
- 아무 도형이나 회전시킨다 (회전 핸들 드래그)
- 리사이즈 핸들이 회전을 따라 움직이는지 확인 (`SelectionHandles`의 `rotation` prop 배선, `SvgEditorSurface.tsx`)
- 리사이즈 핸들을 드래그했을 때 반대쪽 모서리가 월드 좌표 기준으로 고정되어 있는지 확인 (`resizeRotatedElementFromHandle`, `geometry/Transform.ts`) — rhwp의 `calcResizedBboxRotated` 이식 부분
- 이미 유닛 테스트(`Geometry.test.ts` +2)로는 검증됐지만 실제 화면에서 시각적으로 자연스러운지는 미확인

### 2. 화살표 렌더링 확인
- 커넥터 도구로 선을 그리면 기본 스타일이 `endArrow: 'arrow'`로 생성됨 (`WorkspaceEditorLayer.tsx`의 `createConnectorElement`)
- 실제로 선 끝에 삼각형 화살표 머리가 그려지는지 스크린샷/DOM으로 확인 (`SvgRenderer.ts`의 `CONNECTOR_ARROW_MARKER_ID`, `SvgEditorSurface.tsx`의 `<ArrowMarkerDefs>`)
- 도형을 회전/이동해도 화살표 방향이 선 각도를 따라가는지 확인

### 3. 리본 신규 버튼 전수 라이브 테스트
Annotate 탭에서 도형 1~2개 선택한 상태로 아래 버튼들을 하나씩 눌러 기존 사이드바 버튼과 동일하게 동작하는지 확인:
- Arrange 그룹: Duplicate, Delete, Group, Ungroup, Front(맨 앞으로), Back(맨 뒤로)
- Align 그룹: Left, Center, Right, Top, Middle, Bottom, Dist. H(수평 분배), Dist. V(수직 분배), Group, Ungroup
- View 탭: Fit View, Select All
- 참고: 코드는 기존에 이미 구현된 함수를 리본에 배선만 한 것(`WorkflowCanvasPage.tsx`의 `ribbonHandlers`)이라 새 로직은 없음 — 배선 누락/오탈자 여부만 확인하면 됨

### 4. 최종 검증 스위트 재실행
위 1~3 항목을 실제로 눌러보다가 코드를 조금이라도 고쳤다면:
```
cd flowmat_frontend
npm run build
npx tsc --noEmit -p tsconfig.json
npm run lint
npm run test
```
아무것도 안 고쳤다면 이미 이번 세션에 87 tests 전부 통과 확인된 상태라 생략 가능.

### 5. 테스트 데이터 정리 (선택)
이번 세션에 라이브 테스트용으로 `wf_demo_main` 워크플로에 만든 도형들을 지울지 결정:
- `shape-1`, `shape-2` (사각형 2개), `shape-4` (타원 1개, 테스트 중 실수로 생성됨)
- `shape-3` (구 커넥터 — adapter 수정 전에 저장되어 `startBinding`/`endBinding`이 `null`로 굳어있음, 안 따라오는 게 정상이니 혼란 방지 차원에서 지우는 게 좋음)
- `shape-5` (신 커넥터 — 바인딩 정상 작동 확인됨, 데모용으로 남겨둬도 되고 지워도 됨)
- Annotate 탭에서 전체 선택(Ctrl/Cmd+A 또는 Select All 버튼) → Delete로 한 번에 정리 가능

### 6. (선택, 급하지 않음) `docs/editor/current-state.md` 갱신
마스터 상태 문서(2026-08-12 작성)에 이번 세션 작업(커넥터/회전리사이즈/화살표/리본 완성 + 버그 수정 3건)을 반영하는 섹션 추가. 지금 이 파일(`connector-line-progress-2026-08-14.md`)이 임시 세션 로그 역할이라, 최종적으로는 `current-state.md`에 요약 병합하는 게 정리에 좋음.

## 추가로 확인된 리스크 (다음 세션에서 참고)

라이브 테스트 중 직접 겪은 건 아니지만, 코드를 다시 짚어보다가 발견한 것들. 우선순위 낮은 순.

### 확인해보니 문제 없었던 것 (기록용)
아래는 "혹시 버그 아닐까" 의심해서 코드를 다시 읽어봤는데, 실제로는 이미 안전하게 처리되어 있던 것들 — 다음에 또 의심 안 해도 됨:
- **멀티 선택 이동 시 커넥터 추종**: `transformLayerDocuments`(`WorkspaceEditorLayer.tsx:1227`)가 `recomputeBoundLines`에 선택된 도형 id 전체(`split.backendIds`)를 넘기므로, 그룹/다중 선택을 함께 이동해도 구조적으로는 정상 추종됨. 다만 **실제 브라우저에서 다중 선택 이동은 안 눌러봄** — 라이브 확인은 여전히 안 된 상태.
- **여러 도형을 한번에 삭제할 때 바인딩 해제**: `deleteElements`(`EditorDocument.ts:70`)가 삭제되는 id 전체를 모아서 각 라인의 `startBinding`/`endBinding`을 검사하므로, 앵커 도형 두 개를 동시에 지워도 정상적으로 둘 다 detach됨.
- **undo/redo가 바인딩을 보존하는지**: 로컬 히스토리가 문서 전체를 깊은 복사하는 방식이라 `startBinding`/`endBinding`도 그냥 일반 필드처럼 같이 복사됨 — 별도 처리 불필요, 구조적으로 안전.

### 진짜로 남아있는 리스크

1. **백엔드 JSONB 매핑 버그가 다른 곳에도 있을 수 있음** — 이번에 고친 건 `WorkflowEditorDocument`/`WorkflowEditorElement` 두 엔티티뿐. `@Column private String`으로만 선언되고 실제 DB 컬럼은 `jsonb`인데 `@JdbcTypeCode(SqlTypes.JSON)`이 빠진 필드가 백엔드 전체에 더 있을 수 있음(오늘 발견한 3개 필드는 전부 "이 테이블이 처음 실제로 저장 시도된 순간"에야 발견됐다는 점을 기억할 것 — 즉 한 번도 저장 경로를 안 탄 jsonb 컬럼은 똑같이 조용히 깨져 있을 수 있음). 다음에 시간 날 때 `grep -rn "private String.*Json" flowmat_backend/src/main/java` 같은 걸로 전수 점검 권장.
2. **커넥터는 backend editor element끼리만 연결 가능, legacy annotation(도형 주석)에는 못 붙음** — `WorkspaceEditorLayer.tsx:716`의 `backendElementIds.has(anchorMatch.elementId)` 체크 때문에 의도된 제약. 버그는 아니지만, 사용자가 "기존 주석 도형이랑 새 커넥터랑 연결이 안 되네?"라고 헷갈릴 수 있으니 UI 힌트나 문서화가 있으면 좋음.
3. **STOMP 실시간 협업에서 커넥터 바인딩 동기화는 미검증** — 두 브라우저 세션에서 동시에 열어놓고 한쪽에서 도형을 옮겼을 때 다른 쪽 화면의 커넥터도 따라오는지 테스트 안 해봄. 구조상(`EDITOR_DOCUMENT_UPDATED` 수신 시 전체 문서 refetch) 될 것으로 예상되지만 확인은 안 됨.
4. **Windows에서 백엔드 재시작 마찰** — `./gradlew bootRun` 중 `Ctrl+C`가 Gradle 데몬이 띄운 `java.exe`를 완전히 못 죽여서 8080 포트가 계속 점유되는 문제가 이번 세션에서도 재현됨(전에도 있었음). 매번 `Get-NetTCPConnection -LocalPort 8080` → `Stop-Process`로 수동 정리해야 함. 반복되는 마찰이니 `./gradlew --stop` 먼저 쓰거나 재시작 스크립트를 하나 만들어두는 게 나을 수 있음.
5. **Playwright 확장 프로그램 브리지 모드의 입력 안정성** — 이번 세션에서 특정 드래그 패턴(기존 요소 클릭+이동)에서 자동화 입력이 아예 페이지에 도달하지 않는 현상이 있었음(사람이 직접 하면 정상). 앞으로 자동화 브라우저 테스트를 더 자주 할 계획이면, 확장 브리지 대신 Playwright standalone 모드(자체 브라우저 창을 새로 띄우는 방식)가 더 안정적일 수 있음 — 대신 "사용자가 이미 로그인해둔 실제 브라우저를 그대로 조작"하는 편의는 포기해야 함.

## 참고 — 이번 세션에서 함께 고친 백엔드 파일

- `flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/editor/domain/WorkflowEditorDocument.java`
- `flowmat_backend/src/main/java/org/myweb/flowmat/domain/workflow/editor/domain/WorkflowEditorElement.java`

프론트엔드는 `npm run dev`(Vite HMR)라 소스 수정이 즉시 반영되지만, 백엔드는 `./gradlew bootRun`이 코드 변경을 자동 반영하지 않으므로 **Java 파일을 고칠 때마다 사용자가 수동으로 재시작**해야 함(이번 세션에서 실제로 재시작 1회 필요했음).
