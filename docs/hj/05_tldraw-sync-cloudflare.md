# tldraw-sync-cloudflare 분석

## 1. 레포 개요

- `tldraw-sync-cloudflare`는 캔버스 엔진 자체를 새로 구현한 레포가 아니라, `tldraw` 편집기를 Cloudflare Durable Objects와 연결한 동기화 예제에 가깝다.
- 클라이언트 엔트리는 `tldraw-sync-cloudflare/client/main.tsx`, 실제 룸 화면은 `tldraw-sync-cloudflare/client/pages/Room.tsx`에 있다.
- 서버 측 동기화 핵심은 `tldraw-sync-cloudflare/worker/worker.ts`와 `tldraw-sync-cloudflare/worker/TldrawDurableObject.ts`에 있다.

## 2. 로컬 구동 결과

- 확인된 구동 명령은 `tldraw-sync-cloudflare/package.json`의 `vite --host` 기반 `dev` 스크립트다.
- `tldraw-sync-cloudflare/README.md`에는 로컬 개발 서버가 `http://localhost:5137`에서 동작한다고 적혀 있다.
- 사용자 수동 테스트 기준 로컬 구동과 브라우저 화면 확인은 성공이다.
- Codex 검수 단계에서는 dev 서버를 재실행하지 않았고, 코드 구조와 파일 경로만 확인했다.

## 3. 핵심 기능

- `client/pages/Root.tsx`에서 로컬 방 ID를 만든 뒤 룸 페이지로 이동한다.
- `client/pages/Room.tsx`에서 `useSync`로 원격 스토어를 만들고 `<Tldraw store={store} />`를 마운트한다.
- `worker/TldrawDurableObject.ts`에서 `TLSocketRoom`과 SQLite 기반 동기화 저장소를 연결한다.
- `worker/assetUploads.ts`와 `client/multiplayerAssetStore.tsx`에서 업로드 자산 저장/조회 흐름을 처리한다.
- `client/getBookmarkPreview.tsx`와 `worker/worker.ts`의 `/api/unfurl` 경로에서 북마크 unfurl을 처리한다.

## 4. 테스트 결과

- 사용자 수동 테스트 기준 로컬 구동과 화면 확인은 완료된 상태다.
- Codex 검수 단계에서는 자동 테스트를 실행하지 않았고, 브라우저 재실행이나 Cloudflare worker 재구동도 수행하지 않았다.
- 검수 범위는 실제 파일 구조와 동기화 연결 지점을 확인하는 정적 검수다.

## 5. 주요 파일 구조

- `tldraw-sync-cloudflare/client/main.tsx`: 라우터 진입점
- `tldraw-sync-cloudflare/client/pages/Root.tsx`: 로컬 룸 ID 생성 및 리다이렉트
- `tldraw-sync-cloudflare/client/pages/Room.tsx`: `useSync`와 `Tldraw` 마운트
- `tldraw-sync-cloudflare/client/localStorage.ts`: 로컬 룸 ID 저장
- `tldraw-sync-cloudflare/client/multiplayerAssetStore.tsx`: 업로드 자산 스토어
- `tldraw-sync-cloudflare/client/getBookmarkPreview.tsx`: URL 미리보기 요청
- `tldraw-sync-cloudflare/client/index.css`: 클라이언트 스타일
- `tldraw-sync-cloudflare/worker/worker.ts`: API 라우팅과 Durable Object 연결
- `tldraw-sync-cloudflare/worker/TldrawDurableObject.ts`: 실시간 룸 스토리지와 소켓 동기화
- `tldraw-sync-cloudflare/worker/assetUploads.ts`: 업로드 자산 처리

## 6. 기능별 구현 위치

- 도형/노드 생성: 이 레포 내부에서 도형 생성 알고리즘을 직접 구현한 파일은 확인하지 못했다. `tldraw-sync-cloudflare/client/pages/Room.tsx`에서 `<Tldraw />`를 마운트하고 있어 실제 도형 생성 로직은 외부 `tldraw` 패키지에 위임된다.
- 선/엣지/화살표 생성: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `tldraw-sync-cloudflare/client/pages/Room.tsx`에서 `tldraw` 편집기를 사용한다.
- 드래그/이동: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `tldraw-sync-cloudflare/client/pages/Room.tsx`의 `Tldraw` 마운트에 위임된다.
- 줌/팬: 이 레포 내부 직접 구현 위치는 확인하지 못했다. `tldraw-sync-cloudflare/client/pages/Room.tsx`의 `Tldraw` 마운트에 위임된다.
- 상태 관리: 클라이언트 쪽 동기화 진입은 `tldraw-sync-cloudflare/client/pages/Room.tsx`의 `useSync`, 서버 쪽 룸 상태는 `tldraw-sync-cloudflare/worker/TldrawDurableObject.ts`, API 라우팅은 `tldraw-sync-cloudflare/worker/worker.ts`, 자산 동기화는 `tldraw-sync-cloudflare/client/multiplayerAssetStore.tsx`와 `tldraw-sync-cloudflare/worker/assetUploads.ts`에 있다.
- 스타일 관련 파일: `tldraw-sync-cloudflare/client/index.css`

## 7. Flow Mat 적용 가능성

- Flow Mat가 Cloudflare 기반 실시간 협업 백엔드를 검토한다면 참고 가치가 높다.
- 반대로 Flow Mat의 핵심 고민이 노드/엣지 편집 로직이라면, 이 레포는 그 부분보다 "tldraw 상태를 네트워크에 실어 보내는 방법" 쪽에 더 가깝다.
- 즉, 편집기 엔진 레퍼런스라기보다 협업 배선 레퍼런스로 보는 편이 정확하다.

## 8. 이식 시 주의사항

- 이 레포는 `tldraw` 레코드 모델을 전제로 한다. Flow Mat의 내부 상태 모델이 다르면 그대로 재사용하기 어렵다.
- Cloudflare Durable Objects, SQLite 래퍼, R2 업로드 흐름까지 함께 얽혀 있어 백엔드 선택이 다르면 구조를 많이 바꿔야 한다.
- 에디터 기능 자체는 이 레포가 아니라 외부 `tldraw` 패키지가 담당하므로, 도형/선/줌 로직 레퍼런스를 이 문서 하나에서 찾으려고 하면 안 된다.

## 9. 미확인/추가 확인 필요 사항

- `tldraw-sync-cloudflare/README.md`에는 `client/App.tsx`, `worker/bookmarkUnfurling.ts` 같은 경로가 적혀 있지만, 현재 저장소에서 실제 확인된 파일은 `client/pages/Room.tsx`, `client/getBookmarkPreview.tsx`, `worker/worker.ts`다. README 설명과 실제 파일 구조 사이의 차이는 `추가 확인 필요`다.
- 북마크 unfurl과 자산 업로드의 런타임 동작은 재실행 없이 코드 기준으로만 확인했다.

## 10. 중간 결론

- `tldraw-sync-cloudflare`는 Flow Mat의 편집기 엔진보다 협업 백엔드 배선 사례로 참고하기 좋은 레포다.
- Flow Mat가 tldraw 계열 레코드 모델을 채택하지 않는다면, 코드 전체를 이식하기보다 동기화 구조만 선별 참고하는 편이 적절하다.
