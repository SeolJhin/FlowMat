# excalidraw 분석

## 1. 레포 개요

- `excalidraw`도 단일 앱이 아니라 앱 셸과 라이브러리 패키지가 함께 있는 모노레포다.
- 브라우저 앱 쪽 진입은 `excalidraw/excalidraw-app`에 있고, 핵심 편집기 로직은 `excalidraw/packages/excalidraw`, 요소 생성/이동/장면 관리는 `excalidraw/packages/element`에 있다.
- Flow Mat 관점에서는 앱 화면보다는 요소 생성 함수, 드래그 로직, 줌 상태, 씬/스토어 구조가 핵심 참고 지점이다.

## 2. 로컬 구동 결과

- 루트 `excalidraw/package.json`의 `start` 스크립트는 `yarn --cwd ./excalidraw-app start`를 호출한다.
- `excalidraw/excalidraw-app/package.json` 기준 실제 앱 개발 서버는 `vite`로 실행된다.
- 사용자 수동 테스트 기준 로컬 구동과 브라우저 화면 확인은 성공이다.
- Codex 검수 단계에서는 dev 서버를 재실행하지 않았고, 코드 구조와 파일 경로만 확인했다.

## 3. 핵심 기능

- 메인 편집기 상호작용은 `excalidraw/packages/excalidraw/components/App.tsx`에 크게 모여 있다.
- 새 요소 생성은 `excalidraw/packages/element/src/newElement.ts`에 모여 있다.
- 선형 요소 편집과 화살표 보정은 `excalidraw/packages/element/src/linearElementEditor.ts`, `excalidraw/packages/element/src/elbowArrow.ts`에서 확인된다.
- 장면과 상태 관리는 `excalidraw/packages/element/src/Scene.ts`, `excalidraw/packages/element/src/store.ts`, `excalidraw/packages/excalidraw/appState.ts`에 나뉘어 있다.

## 4. 테스트 결과

- 사용자 수동 테스트 기준 로컬 구동과 화면 확인은 완료된 상태다.
- Codex 검수 단계에서는 자동 테스트를 실행하지 않았고, 브라우저 재실행도 수행하지 않았다.
- 검수 범위는 실제 소스 파일 기준의 구현 위치와 구조 확인이다.

## 5. 주요 파일 구조

- `excalidraw/excalidraw-app/index.tsx`: 브라우저 앱 진입점
- `excalidraw/excalidraw-app/App.tsx`: 앱 셸, 저장/불러오기/협업 훅 연결
- `excalidraw/excalidraw-app/index.scss`: 앱 레벨 스타일
- `excalidraw/packages/excalidraw/components/App.tsx`: 메인 편집기 컴포넌트와 이벤트 처리
- `excalidraw/packages/excalidraw/components/shapes.tsx`: 툴바 도형 정의
- `excalidraw/packages/element/src/newElement.ts`: 새 요소 생성 함수 모음
- `excalidraw/packages/element/src/dragElements.ts`: 요소 드래그 이동
- `excalidraw/packages/element/src/linearElementEditor.ts`: 선형 요소 편집
- `excalidraw/packages/element/src/elbowArrow.ts`: 엘보 화살표 보정 로직
- `excalidraw/packages/excalidraw/appState.ts`: 앱 상태 기본값과 상태 구조
- `excalidraw/packages/element/src/Scene.ts`: 장면 컬렉션 관리
- `excalidraw/packages/element/src/store.ts`: 요소 스토어와 변경 추적
- `excalidraw/packages/excalidraw/scene/zoom.ts`: 줌 상태 계산
- `excalidraw/packages/excalidraw/scene/scrollbars.ts`: 스크롤/뷰포트 보조 계산
- `excalidraw/packages/excalidraw/css/styles.scss`: 핵심 스타일
- `excalidraw/packages/excalidraw/css/app.scss`: 앱 스타일

## 6. 기능별 구현 위치

- 도형/노드 생성: 툴바 도구 정의는 `excalidraw/packages/excalidraw/components/shapes.tsx`, 실제 생성 이벤트 처리는 `excalidraw/packages/excalidraw/components/App.tsx`, 요소 생성 함수는 `excalidraw/packages/element/src/newElement.ts`에 있다.
- 선/엣지/화살표 생성: 선형 요소 생성은 `excalidraw/packages/element/src/newElement.ts`, 선형 요소 편집은 `excalidraw/packages/element/src/linearElementEditor.ts`, 엘보 화살표 보정은 `excalidraw/packages/element/src/elbowArrow.ts`에 있다.
- 드래그/이동: 실제 이동 로직은 `excalidraw/packages/element/src/dragElements.ts`에 있고, 입력 이벤트 연결은 `excalidraw/packages/excalidraw/components/App.tsx`에서 처리된다.
- 줌/팬: 휠과 제스처 기반 줌/팬 처리는 `excalidraw/packages/excalidraw/components/App.tsx`에 있고, 줌 상태 계산 보조는 `excalidraw/packages/excalidraw/scene/zoom.ts`, 스크롤 관련 계산은 `excalidraw/packages/excalidraw/scene/scrollbars.ts`에 있다.
- 상태 관리: 앱 상태 구조는 `excalidraw/packages/excalidraw/appState.ts`, 장면 컬렉션은 `excalidraw/packages/element/src/Scene.ts`, 변경 추적 스토어는 `excalidraw/packages/element/src/store.ts`에서 확인된다.
- 스타일 관련 파일: `excalidraw/packages/excalidraw/css/styles.scss`, `excalidraw/packages/excalidraw/css/app.scss`, `excalidraw/excalidraw-app/index.scss`

## 7. Flow Mat 적용 가능성

- 요소 생성, 선형 요소 편집, 줌/팬, 씬 상태 관리 구조를 참고하기에 좋다.
- 특히 `newElement.ts`, `dragElements.ts`, `Scene.ts`, `store.ts`는 자유형 요소 편집기의 핵심 구조를 파악하는 데 유용하다.
- 다만 Flow Mat가 구조화된 플로우 차트에 더 가깝다면, Excalidraw의 자유형 드로잉 전제가 오히려 우회 비용을 만들 수 있다.

## 8. 이식 시 주의사항

- 메인 상호작용 로직이 `components/App.tsx`에 많이 모여 있어 원하는 기능만 부분 분리하기 쉽지 않다.
- 요소 모델과 상태 구조가 Flow Mat의 도메인 모델과 다를 수 있다.
- 자유형 편집기 특성이 강해서 노드 포트, 방향성 엣지, 정밀 레이아웃 같은 요구가 크면 추가 설계가 필요하다.

## 9. 미확인/추가 확인 필요 사항

- 협업 기능, 저장/불러오기 경로, 세부 UX 비교는 이번 문서에서 코드 기준으로만 검토했고, 심화 비교가 필요하다.
- Flow Mat 요구사항과 가장 잘 맞는 요소 서브셋이 무엇인지는 별도 비교가 필요하다.

## 10. 중간 결론

- `excalidraw`는 자유형 요소 생성과 편집 상태 관리 구조를 이해하는 데 좋은 레퍼런스다.
- Flow Mat에 바로 복사하기보다는 요소 생성/이동/줌 상태 설계를 참고하는 용도로 보는 편이 적절하다.
