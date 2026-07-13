# instldraw 분석

## 1. 프로젝트 개요
- 목적: **tldraw의 fork가 아니다.** `instldraw`는 tldraw를 npm 패키지(`"tldraw": "^2.2.1"`)로 그대로 가져다 쓰는 **Next.js 애플리케이션**으로, tldraw의 무한 캔버스에 [InstantDB](https://www.instantdb.com/)(실시간 그래프 DB + presence)를 붙여서 팀 단위 실시간 협업 드로잉 툴을 만든 데모/레퍼런스 앱이다. tldraw 소스 코드 자체는 건드리지 않고, tldraw가 공식 제공하는 `TLStore` / `store` prop, `mergeRemoteChanges`, presence 파생 API(`createPresenceStateDerivation`) 등의 **확장 포인트만 이용해 외부 동기화 엔진을 갈아 끼운 사례**다.
- 라이선스: 저장소에 LICENSE 파일 없음(미명시). README/package.json에도 라이선스 필드 없음.
- 기술 스택: Next.js 14 (Pages Router) + React 18 + TypeScript, tldraw v2.2.1, @instantdb/react v0.19.7(스키마/트랜잭션/실시간쿼리/presence/매직코드 인증), Tailwind CSS, lodash(throttle).

## 2. 전체 구조
```
instldraw/
├── .env.example
├── README.md
├── next.config.mjs
├── package.json
├── resources/
│   ├── demo.mp4
│   └── instant-perms.json      # Instant 대시보드에 붙여넣는 권한 룰 백업
├── public/
│   └── favicon.ico
└── src/
    ├── __dev.tsx
    ├── config.tsx               # localSourceId, 색상 팔레트 등 전역 상수
    ├── instant.schema.ts        # InstantDB 엔티티/링크/room(presence) 스키마
    ├── instant.perms.ts         # 엔티티별 view/create/update/delete 권한 룰
    ├── mutators.ts              # 모든 DB 쓰기(transact) 함수 모음
    ├── types.ts                 # DrawingState 타입(=tldraw 레코드 + meta)
    ├── components/
    │   ├── InstantAuth.tsx      # 매직코드 로그인 UI
    │   └── UI.tsx                # 대시보드 공용 UI 컴포넌트
    ├── lib/
    │   ├── clientDB.tsx          # InstantDB 클라이언트 init (schema 바인딩)
    │   ├── useInstantStore.tsx   # tldraw TLStore <-> Instant 실시간 동기화 훅
    │   └── useInstantPresence.tsx# tldraw presence <-> Instant room presence 훅
    ├── pages/
    │   ├── _app.tsx
    │   ├── index.tsx             # 팀/드로잉 대시보드
    │   └── drawings/[id].tsx     # tldraw 캔버스 페이지 (실제 협업 렌더링)
    └── styles/
        └── globals.css
```

## 3. 핵심 패턴

### 패턴 1 — 외부 스토어를 tldraw `TLStore`에 갈아 끼우는 어댑터 훅 (`useInstantStore`)
tldraw는 `<Tldraw store={...} />`에 자체 구현 `TLStoreWithStatus`를 주입할 수 있게 설계돼 있다. instldraw는 이 지점을 이용해 로컬 `createTLStore()`를 만들고, tldraw의 `store.listen(..., { source: "user", scope: "document" })`으로 로컬 변경만 감지해 throttle 후 DB에 반영하며, 원격 변경은 `store.mergeRemoteChanges()`로 감싸 적용해 무한 루프(로컬 echo)를 차단한다. 각 레코드에 `meta.source`(작성자 id)와 `meta.version`(uniqueId)을 붙여 "내가 만든 변경은 되돌려 반영하지 않기" + "동일 버전이면 재적용 skip"을 구현한다.

```ts
function syncInstantStateToTldrawStore(store, state, localSourceId) {
  store.mergeRemoteChanges(() => {
    const updates = Object.values(state).filter((item) => {
      const tlItem = store.get(item.id);
      const diffVersion = tlItem?.meta.version !== item?.meta.version;
      const diffSource = item?.meta.source !== localSourceId;
      return diffSource && diffVersion;
    });
    if (updates.length) store.put(updates);
    // + removeIds via store.remove(...)
  });
}
```

### 패턴 2 — Last-Write-Wins 필드 단위 병합 + 삭제 톰스톤 + 클라이언트 스로틀
캔버스 전체를 매번 통째로 저장하지 않고, `DrawingState = Record<recordId, TLRecord|null>` 형태의 **레코드 단위 diff 맵**을 InstantDB의 `merge()`(딥머지, 없는 키만 갱신)로 반영한다. 삭제는 실제 delete가 아니라 `meta.deleted: true`를 단 톰스톤 레코드로 표현해 다른 클라이언트가 remove를 인지하게 한다. 로컬 변경은 `lodash.throttle(200ms, {leading:true, trailing:true})`로 모아 보낸다 — URL `?x_throttle=`로 조정 가능해 디버깅/데모 친화적이다.

```ts
export function updateDrawingState({ drawingId, state }) {
  return clientDB.transact(clientDB.tx.drawings[drawingId].merge({ state }));
}
```

### 패턴 3 — Presence를 "룸" 개념으로 분리하고 tldraw 공식 presence 파생 API 재사용
InstantDB 스키마에 `rooms.drawings.presence`를 별도로 선언해, 영속 데이터(엔티티/링크)와 휘발성 프레즌스(커서/선택 영역)를 완전히 분리한다. presence 값 자체는 tldraw가 제공하는 `createPresenceStateDerivation(userAtom)(editor.store)`로 생성한 `TLInstancePresence` signal을 그대로 publish/subscribe만 한다 — 커서 좌표 계산, 색상 렌더링 등은 전부 tldraw 내부 로직에 위임하고, instldraw는 "전송 계층"만 담당한다.

```ts
const room = clientDB.room("drawings", drawingId);
const presence = clientDB.rooms.usePresence(room);
// ...
const tldrawPresenceSignal = createPresenceStateDerivation(userAtom)(editor.store);
react("publish presence", () => {
  presence.publishPresence({ tldraw: tldrawPresenceSignal.get() });
});
```

### 패턴 4 — 선언적 그래프 스키마 + 서버사이드 권한 규칙 (Team/Membership/Invite)
`instant.schema.ts`에서 `teams`-`memberships`-`invites`-`drawings`를 링크(1:N)로 선언하고, `instant.perms.ts`에서 `bind`로 재사용 가능한 boolean 표현식(`isMember`, `isCreator`, `isInvitee` 등)을 정의한 뒤 엔티티별 `view/create/update/delete`에 매핑한다. 권한 로직이 클라이언트 코드가 아니라 스키마와 함께 버저닝되는 별도 파일(및 `resources/instant-perms.json`로 대시보드에 반영)로 존재해, 데이터 모델과 접근 제어가 한 세트로 관리된다.

## 4. FlowMat 이식 포인트

| 패턴/기능 | 이식 방식 | 우선순위(상/중/하) | 비고 |
|---|---|---|---|
| 로컬 변경만 감지 + 원격 변경은 별도 경로로 병합(echo 차단) | @xyflow/react의 `onNodesChange`/`onEdgesChange`에서 로컬 origin 태깅, 서버 push분은 origin 무시하고 `applyNodeChanges`류로 직접 반영 | 상 | xyflow는 tldraw의 `mergeRemoteChanges` 같은 내장 장치가 없어 직접 origin 플래그(zustand 상태 또는 ref)로 구현 필요 |
| 레코드 단위 diff + meta(source/version) 기반 LWW | 노드/엣지 업데이트를 통짜 스냅샷이 아닌 id별 변경 맵으로 전송, 각 레코드에 `updatedBy`+`version`(또는 서버 timestamp) 부여 | 상 | 백엔드가 Spring Boot/JPA이므로 WebSocket(STOMP) 브로드캐스트 페이로드를 diff 단위로 설계하면 그대로 적용 가능 |
| 삭제 톰스톤 패턴 | 노드/엣지 삭제 시 즉시 hard delete 대신 `deleted:true` 플래그로 전파 후 클라이언트가 필터링, 이후 배치로 정리 | 중 | FlowMat이 이미 batch 패키지 보유 — 톰스톤 정리 배치잡으로 자연스럽게 연결 가능 |
| presence를 별도 채널/토픽으로 분리 | 캔버스 문서 상태(WebSocket topic A)와 커서/선택 등 프레즌스(topic B, 비영속)를 분리해 STOMP destination 나누기 | 중 | 협업 커서/포커스 기능을 나중에 붙일 계획이면 초기 설계 단계에서 분리해두는 게 유리 |
| 클라이언트 사이드 throttle로 쓰기 폭주 제어 | 노드 드래그 등 고빈도 이벤트를 `lodash.throttle` 또는 자체 debounce로 묶어 서버 전송 | 상 | 구현 난이도 낮고 즉시 적용 가능, 서버 부하/스토리지 쓰기 절감에 직결 |
| bind 기반 재사용 권한식(팀/멤버십 모델) | teams-memberships-invites 관계형 데이터 모델을 Spring Security의 `@PreAuthorize` 표현식 또는 커스텀 PermissionEvaluator로 이식 | 하 | InstantDB 특유의 그래프 쿼리 문법(`data.ref(...)`)은 그대로 이식 불가, 개념(재사용 가능한 boolean 규칙 이름 부여)만 참고 |
| 매직코드 인증(InstantAuth) | 그대로 이식 불가 — InstantDB 종속 기능 | 하 | FlowMat은 이미 자체 인증 체계를 갖고 있을 가능성이 높아 참고 가치 낮음 |

## 5. 직접 통합 vs 패턴 참고

### 직접 통합 가능
- 없음. instldraw는 tldraw + InstantDB 조합에 강하게 결합되어 있고, FlowMat은 @xyflow/react + Spring Boot/JPA 조합이라 코드 레벨로 그대로 가져다 쓸 수 있는 모듈은 없다. (라이브러리 의존성 자체가 완전히 다름 — tldraw 자체를 도입할 계획이 아니라면 패키지 재사용 불가.)

### 패턴만 참고 (재구현 필요)
- 로컬-echo 차단 동기화 어댑터 구조 (`useInstantStore`의 listen/merge 분리 패턴) → xyflow + Spring WebSocket 조합으로 재구현
- 레코드 단위 diff + `meta.source`/`meta.version` 필드를 통한 LWW 충돌 해결 → FlowMat의 Node/Edge 엔티티에 `updatedBy`, `version`(또는 `updatedAt`) 컬럼 추가해 재구현
- 삭제 톰스톤 표현 방식 → soft-delete 플래그 + 배치 정리로 재구현
- presence를 문서 상태와 분리된 채널로 다루는 설계 → STOMP topic 분리로 재구현
- 클라이언트 throttle을 통한 쓰기 폭주 제어 → 프론트 zustand 스토어 + throttle/debounce 유틸로 재구현
- 관계형 데이터 모델(팀/멤버십/초대)과 재사용 가능한 명명된 권한식 아이디어 → Spring Security 권한 설계 시 개념적으로만 참고
