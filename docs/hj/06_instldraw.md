# instldraw 분석

## 1. 레포 개요

- `instldraw`는 Next.js 앱 위에 Instant DB와 `tldraw`를 결합한 협업 드로잉 예제다.
- 로그인과 팀/초대/드로잉 목록 화면은 `instldraw/src/pages/index.tsx`에 있다.
- 실제 드로잉 화면은 `instldraw/src/pages/drawings/[id].tsx`에서 `Tldraw`를 마운트한다.
- 실시간 스토어 어댑터는 `instldraw/src/lib/useInstantStore.tsx`, 프레즌스 동기화는 `instldraw/src/lib/useInstantPresence.tsx`에서 처리한다.

## 2. 로컬 구동 결과

- 확인된 구동 명령은 `instldraw/package.json`의 `next dev` 기반 `dev` 스크립트다.
- `instldraw/README.md`에는 `NEXT_PUBLIC_INSTANT_APP_ID` 환경 변수 설정 후 `npm run dev` 또는 동등한 패키지 매니저 명령으로 실행하도록 적혀 있다.
- `instldraw/README.md`에는 브라우저 접속 주소가 `http://localhost:3000`으로 적혀 있다.
- 사용자 확인 기준으로 로컬에서는 로그인 화면까지만 확인되었다.
- 사용자 요청 조건대로 로그인 이후 대시보드, 드로잉 목록, 실제 드로잉 편집 기능은 이번 문서에서 `미확인`으로 유지한다.
- Codex 검수 단계에서는 dev 서버를 재실행하지 않았고, 코드 구조와 파일 경로만 확인했다.

## 3. 핵심 기능

- `src/components/InstantAuth.tsx`에서 이메일 기반 매직 코드 로그인 UI를 제공한다.
- `src/pages/index.tsx`에서 인증 상태, 팀 생성, 초대 수락/거절, 드로잉 생성/삭제 흐름을 조합한다.
- `src/pages/drawings/[id].tsx`에서 `useInstantStore()`와 `useInstantPresence()`를 통해 협업형 `Tldraw` 스토어를 연결한다.
- `src/mutators.ts`, `src/instant.schema.ts`, `src/instant.perms.ts`에서 Instant DB 데이터 구조와 권한 규칙을 정의한다.

## 4. 테스트 결과

- 이번 작업에서는 자동 테스트를 실행하지 않았다.
- 사용자 수동 테스트 기준 로그인 화면까지는 확인된 상태다.
- Codex 검수 단계에서는 로그인 이후 화면을 포함한 브라우저 재검증을 수행하지 않았다.
- 검수 범위는 실제 파일 구조와 인증/동기화 연결 지점을 확인하는 정적 검수다.

## 5. 주요 파일 구조

- `instldraw/src/pages/_app.tsx`: Next.js 앱 공통 래퍼
- `instldraw/src/pages/index.tsx`: 로그인, 팀/초대, 드로잉 목록 화면
- `instldraw/src/pages/drawings/[id].tsx`: 드로잉 편집 화면과 `Tldraw` 마운트
- `instldraw/src/components/InstantAuth.tsx`: 인증 UI
- `instldraw/src/lib/clientDB.tsx`: Instant 클라이언트 초기화
- `instldraw/src/lib/useInstantStore.tsx`: tldraw 스토어와 Instant 상태 동기화
- `instldraw/src/lib/useInstantPresence.tsx`: 사용자 프레즌스 동기화
- `instldraw/src/mutators.ts`: 팀/초대/드로잉 관련 변경 함수
- `instldraw/src/instant.schema.ts`: 데이터 스키마와 room presence 구조
- `instldraw/src/instant.perms.ts`: 권한 정책
- `instldraw/src/config.tsx`: 로컬 소스 ID, 커서 색상 등 설정
- `instldraw/src/styles/globals.css`: 앱 글로벌 스타일

## 6. 기능별 구현 위치

- 도형/노드 생성: 이 레포 내부에서 도형 생성 알고리즘을 직접 구현한 파일은 확인하지 못했다. `instldraw/src/pages/drawings/[id].tsx`에서 `<Tldraw />`를 마운트하고 있어 실제 도형 생성 로직은 외부 `tldraw` 패키지에 위임된다.
- 선/엣지/화살표 생성: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `instldraw/src/pages/drawings/[id].tsx`에서 `tldraw` 편집기를 사용한다.
- 드래그/이동: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `instldraw/src/pages/drawings/[id].tsx`의 `Tldraw` 마운트에 위임된다.
- 줌/팬: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `instldraw/src/pages/drawings/[id].tsx`의 `Tldraw` 마운트에 위임된다.
- 상태 관리: 에디터 스토어 어댑터는 `instldraw/src/lib/useInstantStore.tsx`, 프레즌스는 `instldraw/src/lib/useInstantPresence.tsx`, Instant 초기화는 `instldraw/src/lib/clientDB.tsx`, 데이터 구조는 `instldraw/src/instant.schema.ts`, 쓰기 로직은 `instldraw/src/mutators.ts`, 권한은 `instldraw/src/instant.perms.ts`에 있다.
- 스타일 관련 파일: `instldraw/src/styles/globals.css`, 그리고 `instldraw/src/pages/drawings/[id].tsx`에서 import 하는 `tldraw/tldraw.css`

## 7. Flow Mat 적용 가능성

- 외부 실시간 DB와 `tldraw` 스토어를 연결하는 방식 자체는 참고 가치가 높다.
- 특히 `useInstantStore.tsx`는 원격 상태를 `tldraw` 레코드 변경 흐름과 연결하는 예제로 볼 수 있다.
- 다만 Flow Mat가 `tldraw`를 엔진으로 쓰지 않는다면, 직접 이식 가능한 코드는 제한적일 수 있다.

## 8. 이식 시 주의사항

- 인증, 초대, 팀, 권한, 드로잉 생성 흐름이 Instant DB 모델에 강하게 묶여 있다.
- 로그인 이후 주요 화면은 이번 검수에서 미확인이므로, 실제 UX와 예외 처리 수준을 확정적으로 적으면 안 된다.
- 이 레포 역시 편집기 기능 자체는 외부 `tldraw` 패키지가 담당하고, 레포 내부는 인증/동기화 어댑터 성격이 강하다.

## 9. 미확인/추가 확인 필요 사항

- 사용자 확인 기준으로 로그인 화면까지만 확인되었고, 로그인 이후 기능은 `미확인`이다.
- `instldraw/src/pages/index.tsx`에 있는 팀 생성, 초대 수락/거절, 드로잉 생성/삭제 흐름이 실제 런타임에서 어떻게 보이는지는 `추가 확인 필요`다.
- `instldraw/src/pages/drawings/[id].tsx`의 실제 편집 화면, 협업 커서, 드로잉 이름 수정 UX도 `추가 확인 필요`다.

## 10. 중간 결론

- `instldraw`는 Flow Mat에서 인증된 협업 캔버스 어댑터를 설계할 때 참고 가치가 있다.
- 다만 현재 확인 범위는 로그인 화면까지이며, 로그인 이후 편집 기능은 미확인 상태로 두는 것이 맞다.
