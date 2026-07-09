# instldraw — 전수조사 보고서 및 FlowMat 이식 가이드

> 조사 기준: `E:\projects\git\instldraw` 로컬 클론 직접 분석  
> 스택: Next.js 14 + React 18 + tldraw v2.2.1 + InstantDB + Tailwind CSS

## 1. 레포 전체 구조

```
instldraw/
├── src/
│   ├── lib/
│   │   ├── clientDB.tsx           - InstantDB 클라이언트 초기화
│   │   ├── useInstantStore.tsx    - 캔버스 상태 실시간 동기화 훅 (핵심)
│   │   └── useInstantPresence.tsx - 멀티플레이어 커서 presence 훅 (핵심)
│   ├── pages/
│   │   ├── _app.tsx               - Next.js 앱 래퍼
│   │   ├── index.tsx              - 팀 목록/관리 페이지
│   │   └── drawings/[id].tsx      - 드로잉 캔버스 페이지
│   ├── components/
│   │   ├── InstantAuth.tsx        - 이메일 Magic Code 인증 UI
│   │   └── UI.tsx                 - 다이얼로그 컴포넌트
│   ├── instant.schema.ts          - DB 스키마 정의
│   ├── instant.perms.ts           - 권한 정책 (TypeScript)
│   ├── mutators.ts                - DB 쓰기 함수 모음
│   └── types.ts                   - 타입 정의
└── resources/
    └── instant-perms.json         - 권한 정책 JSON (배포용)
```

---

## 2. DB 스키마 설계

**파일**: `src/instant.schema.ts`

```ts
const schema = i.schema({
  entities: {
    // 드로잉 (FlowMat의 workflow에 대응)
    drawings: i.entity({
      name: i.string(),
      state: i.json().optional(),  // 캔버스 상태 전체를 JSON으로 저장
    }),

    // 팀 초대장
    invites: i.entity({
      teamId: i.string(),
      teamName: i.string(),
      userEmail: i.string(),
      status: i.string().optional(),  // undefined=pending, "accepted", "declined"
      membershipId: i.string(),       // 연결된 membership ID
    }),

    // 팀 멤버십 (팀-유저 관계)
    memberships: i.entity({
      teamId: i.string(),
      userEmail: i.string(),
      userId: i.string().optional(),  // 초대 수락 전에는 null
    }),

    // 팀 (FlowMat의 project에 대응)
    teams: i.entity({
      creatorId: i.string(),
      name: i.string(),
    }),
  },

  links: {
    drawingsTeams:       { forward: { on: "drawings",    has: "one",  label: "teams"       },
                           reverse: { on: "teams",       has: "many", label: "drawings"    } },
    invitesTeams:        { forward: { on: "invites",     has: "one",  label: "teams"       },
                           reverse: { on: "teams",       has: "many", label: "invites"     } },
    invitesMemberships:  { forward: { on: "invites",     has: "one",  label: "memberships" },
                           reverse: { on: "memberships", has: "many", label: "invites"     } },
    membershipsTeams:    { forward: { on: "memberships", has: "one",  label: "teams"       },
                           reverse: { on: "teams",       has: "many", label: "memberships" } },
  },

  // 실시간 presence (커서, 선택 상태) — DB 저장 안 됨, 휘발성
  rooms: {
    drawings: {  // drawingId별 방
      presence: i.entity({
        tldraw: i.json<TLInstancePresence>(),
      }),
    },
  },
})
```

**FlowMat 매핑:**

| instldraw 개념 | FlowMat 대응 테이블 | 비고 |
|---|---|---|
| `team` | `project` | creatorId = 소유자 |
| `memberships` | `project_member` | userId null = 초대 미수락 |
| `invites` | `project_invite` | 2-step 초대 패턴 |
| `drawings` | `workflow` | state = 캔버스 JSON |
| `rooms.drawings.presence` | (없음) | WebSocket presence로 구현 필요 |

---

## 3. 권한 정책 설계

**파일**: `src/instant.perms.ts`

```ts
const rules = {
  teams: {
    bind: [
      "isCreator", "auth.id == data.creatorId",
      "isMember",  "auth.id in data.ref('memberships.userId')",
    ],
    allow: {
      view:   "isMember",    // 멤버만 볼 수 있음
      create: "isCreator",
      delete: "isCreator",   // 소유자만 삭제
      update: "isCreator",
    },
  },

  drawings: {
    bind: [
      "isMember", "auth.id in data.ref('teams.memberships.userId')",
    ],
    allow: {
      view:   "isMember",    // 팀 멤버만
      create: "isMember",
      delete: "isMember",
      update: "isMember",
    },
  },

  memberships: {
    bind: [
      "isMember",   "auth.id in data.ref('teams.memberships.userId')",
      "isCreator",  "auth.id in data.ref('teams.creatorId')",
      "isUser",     "auth.id == data.userId",
      "isInvitee",  "auth.email in data.ref('teams.invites.userEmail')",
    ],
    allow: {
      view:   "isMember",    // 팀 멤버만 목록 조회
      create: "isCreator",   // 소유자만 생성 (초대 수락 시)
      delete: "isUser",      // 본인만 탈퇴
      update: "isInvitee",   // 초대받은 사람이 수락 시 userId 업데이트
    },
  },

  invites: {
    bind: [
      "isMember",  "auth.id in data.ref('teams.memberships.userId')",
      "isInvitee", "auth.email == data.userEmail",
    ],
    allow: {
      view:   "isInvitee",   // 본인의 초대장만
      create: "isMember",    // 팀 멤버가 초대 생성
      delete: "isMember",    // 팀 멤버가 초대 취소
      update: "isInvitee",   // 본인이 수락/거절
    },
  },
}
```

**FlowMat Spring Boot 권한 적용 방안:**

```java
// CustomPermissionEvaluator
public boolean isTeamMember(String teamId, String userId) {
  return membershipRepo.existsByTeamIdAndUserId(teamId, userId)
}
public boolean isTeamCreator(String teamId, String userId) {
  return teamRepo.existsByIdAndCreatorId(teamId, userId)
}

// 컨트롤러 계층 @PreAuthorize
@PutMapping("/drawings/{id}")
@PreAuthorize("@perm.isTeamMember(#id, authentication.principal.id)")
public Drawing updateDrawing(@PathVariable String id, @RequestBody DrawingRequest req) { ... }
```

---

## 4. useInstantStore — 캔버스 실시간 동기화 (핵심)

**파일**: `src/lib/useInstantStore.tsx`

전체 동작 원리:

```
로컬 편집 (tldraw)
  → tldrawEventToStateSlice()  // 변경분만 추출
  → throttle(200ms)            // 배치로 모음
  → updateDrawingState()       // DB에 merge() 저장
  → InstantDB broadcast
  → 다른 클라이언트 subscribeQuery 트리거
  → syncInstantStateToTldrawStore()  // 원격 변경 적용
```

### 4.1 변경 감지 → StateSlice 변환

```ts
function tldrawEventToStateSlice(
  event: HistoryEntry<TLRecord>,
  localSourceId: string,
): DrawingState {
  const state: DrawingState = {}

  // 생성/수정된 항목
  const items = [
    ...Object.values(event.changes.added),
    ...Object.values(event.changes.updated).map(([_, next]) => next),
  ]

  for (const item of items) {
    state[item.id] = {
      ...item,
      meta: {
        source: localSourceId,   // 누가 변경했는지
        version: uniqueId(),     // 충돌 해결용 버전
      },
    }
  }

  // 삭제된 항목 → Soft Delete (실제 삭제 아님)
  for (const item of Object.values(event.changes.removed)) {
    state[item.id] = {
      ...item,
      meta: {
        source: localSourceId,
        version: uniqueId(),
        deleted: true,           // 삭제 플래그
      },
    }
  }

  return state
}
```

### 4.2 스로틀링 (200ms 배치)

```ts
let pendingState: DrawingState = {}

// 기본 200ms 배치, URL 파라미터로 조절 가능 (?x_throttle=0)
const enqueueSync = throttle(runSync, 200, { leading: true, trailing: true })

function sync(state: DrawingState) {
  pendingState = { ...pendingState, ...state }  // 누적
  enqueueSync()
}

function runSync() {
  updateDrawingState({ drawingId, state: pendingState })  // DB에 저장
  pendingState = {}
}
```

### 4.3 원격 변경 → 로컬 tldraw 반영

```ts
function syncInstantStateToTldrawStore(
  store: TLStore,
  state: DrawingState,
  localSourceId: string,
) {
  store.mergeRemoteChanges(() => {  // ← 이 안에서 변경해야 listener 무시됨
    const removeIds = Object.values(state)
      .filter(item => item?.meta.deleted && store.has(item.id))
      .map(item => item!.id)

    const updates = Object.values(state).filter(item => {
      if (!item || item.meta.deleted) return false
      const existing = store.get(item.id as TLShapeId)

      const isNewVersion = existing?.meta.version !== item.meta.version
      const isFromOther  = item.meta.source !== localSourceId  // 내 변경은 무시

      return isFromOther && isNewVersion
    })

    if (updates.length) store.put(updates as TLRecord[])
    if (removeIds.length) store.remove(removeIds as TLShapeId[])
  })
}
```

**충돌 해결 규칙:**
- 다른 사람의 변경 + 버전이 다르면 → 원격 채택
- 내가 한 변경이면 → 무시 (이미 로컬에 있음)
- 삭제 플래그 → store.remove()

### 4.4 전체 생명주기

```ts
export function useInstantStore({ drawingId, localSourceId }) {
  // 1. tldraw 스토어 생성
  const tlStore = createTLStore({ shapeUtils: [...defaultShapeUtils] })

  // 2. DB 구독
  clientDB._core.subscribeQuery(
    { drawings: { $: { where: { id: drawingId } } } },
    (res) => {
      const state = res.data?.drawings?.find(d => d.id === drawingId)?.state ?? {}

      if (lifecycleState === 'pending') {
        initDrawing(state)         // 첫 로드
      } else if (lifecycleState === 'ready') {
        syncInstantStateToTldrawStore(tlStore, state, localSourceId)  // 원격 변경
      }
    }
  )

  // 3. 초기화 시 로컬 변경 감지 등록
  function initDrawing(state) {
    tlStore.listen(
      (event) => {
        if (event.source !== 'user') return  // 원격 변경 무시
        sync(tldrawEventToStateSlice(event, localSourceId))
      },
      { source: 'user', scope: 'document' }
    )

    // mergeRemoteChanges 안에서 loadSnapshot → listener 발동 안 함
    tlStore.mergeRemoteChanges(() => {
      loadSnapshot(tlStore, { document: { store: omitDeleted(state), schema: ... } })
    })

    lifecycleState = 'ready'
    setStoreWithStatus({ status: 'synced-remote', store: tlStore })
  }
}
```

**FlowMat 적용 핵심:**

```ts
// FlowMat 버전 (React Flow 기반)
function useFlowMatCollabStore(workflowId: string, userId: string) {
  // 1. WebSocket 연결
  const ws = useWebSocket(`ws://server/workflow/${workflowId}`)

  // 2. 로컬 변경 → 스로틀 → WebSocket 전송
  const pendingChanges = useRef<ProcessChange[]>([])
  const flushChanges = useCallback(throttle(() => {
    ws.send(JSON.stringify({ type: 'update', changes: pendingChanges.current }))
    pendingChanges.current = []
  }, 200), [ws])

  // 3. 원격 변경 수신 → React Flow 상태 반영
  ws.onmessage = (event) => {
    const { changes } = JSON.parse(event.data)
    applyRemoteChanges(changes, userId)  // 내 변경 제외하고 반영
  }
}
```

---

## 5. useInstantPresence — 멀티플레이어 커서

**파일**: `src/lib/useInstantPresence.tsx`

```ts
export function useInstantPresence({ editor, drawingId, user }) {
  // 1. drawingId별 Room 생성
  const room = clientDB.room('drawings', drawingId)

  // 2. 모든 접속자의 presence 구독
  const presence = clientDB.rooms.usePresence(room)
  const prevPeersRef = useRef({})

  // 3. 다른 사용자 커서 동기화
  useEffect(() => {
    if (presence.isLoading) return

    const peers = Object.entries(presence.peers).filter(([, p]) => p.tldraw)

    // 새 사용자의 커서 추가
    const updates = peers.map(([, p]) => p.tldraw)

    // 나간 사용자의 커서 제거
    const removals = Object.entries(prevPeersRef.current)
      .filter(([k]) => !presence.peers[k])
      .map(([, v]) => v.tldraw.id)

    if (updates.length) editor.store.put(updates)
    if (removals.length) editor.store.remove(removals)

    prevPeersRef.current = presence.peers
  }, [presence.peers])

  // 4. 내 커서 위치 브로드캐스트
  useEffect(() => {
    const userAtom = atom('user', user)

    // tldraw의 presence signal (커서 위치, 선택 상태 자동 추적)
    const presenceSignal = createPresenceStateDerivation(userAtom)(editor.store)

    const stop = react('publish presence', () => {
      const myPresence = presenceSignal.get()
      if (!myPresence) return
      presence.publishPresence({ tldraw: myPresence })
    })

    return stop
  }, [user.id, user.color, user.name])
}
```

**TLInstancePresence 구조 (tldraw가 제공하는 커서 타입):**

```ts
type TLInstancePresence = {
  id: TLInstancePresenceID
  userId?: string
  userName?: string
  color?: string
  position: { x: number; y: number }
  selectedIds?: string[]
  // ... 기타 tldraw 상태
}
```

**FlowMat 적용 — Awareness 없이 WebSocket으로:**

```ts
// WebSocket 기반 presence (y-websocket 없이도 가능)
type UserPresence = {
  userId: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
  selectedEdgeId: string | null
}

function usePrecense(workflowId: string) {
  const [remoteCursors, setRemoteCursors] = useState<UserPresence[]>([])

  // 내 커서 → WebSocket으로 전송 (Volatile channel)
  function publishMyCursor(x: number, y: number) {
    ws.send(JSON.stringify({
      type: 'presence',
      cursor: { x, y },
      selectedNodeId: workspaceStore.selectedProcessId,
    }))
  }

  // 원격 커서 수신
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'presence') {
      setRemoteCursors(prev =>
        prev.map(u => u.userId === msg.userId ? { ...u, ...msg } : u)
      )
    }
  }

  return { remoteCursors, publishMyCursor }
}
```

---

## 6. mutators.ts — DB 쓰기 함수

**파일**: `src/mutators.ts`

```ts
// 팀 생성 + 소유자를 첫 멤버로 추가 (원자적 트랜잭션)
export async function createTeamWithMember({ teamName, userEmail, userId }) {
  const teamId = id()
  const membershipId = id()

  return clientDB.transact([
    clientDB.tx.teams[teamId].update({ name: teamName, creatorId: userId }),
    clientDB.tx.memberships[membershipId].update({ teamId, userId, userEmail }),
    clientDB.tx.memberships[membershipId].link({ teams: teamId }),
  ])
}

// 드로잉 생성 (팀과 연결)
export async function createDrawingForTeam({ teamId, drawingName }) {
  const drawingId = id()

  return clientDB.transact([
    clientDB.tx.drawings[drawingId].merge({ name: drawingName }),
    clientDB.tx.drawings[drawingId].link({ teams: teamId }),
    clientDB.tx.teams[teamId].link({ drawings: drawingId }),
  ])
}

// 팀 멤버 초대 (2-step: membership + invite 동시 생성)
export async function inviteMemberToTeam({ teamId, userEmail, teamName }) {
  const inviteId = id()
  const membershipId = id()

  return clientDB.transact([
    // Step 1: userId=null인 membership 먼저 생성
    clientDB.tx.memberships[membershipId].update({ teamId, userEmail }),  // userId 없음
    clientDB.tx.memberships[membershipId].link({ teams: teamId }),

    // Step 2: invite 생성 (status 없음 = pending)
    clientDB.tx.invites[inviteId].update({ userEmail, teamId, teamName, membershipId }),
    clientDB.tx.invites[inviteId].link({ teams: teamId, memberships: membershipId }),
  ])
}

// 초대 수락 → membership의 userId 설정
export async function acceptInvite({ inviteId, membershipId, userId }) {
  return clientDB.transact([
    clientDB.tx.memberships[membershipId].update({ userId }),       // 정식 멤버 확정
    clientDB.tx.invites[inviteId].update({ status: 'accepted' }),
  ])
}

// 초대 거절
export async function declineInvite({ inviteId }) {
  return clientDB.transact([
    clientDB.tx.invites[inviteId].merge({ status: 'declined' }),
  ])
}

// 드로잉 상태 업데이트 — merge() 패턴 핵심
export function updateDrawingState({ drawingId, state }) {
  return clientDB.transact(
    clientDB.tx.drawings[drawingId].merge({ state })  // state만 병합, name 등 유지
  )
}
```

---

## 7. merge() vs update() — Fine-grained 업데이트

instldraw의 핵심 패턴이다.

```ts
// ✅ merge() — state 필드만 업데이트, name 등 다른 필드 보존
clientDB.tx.drawings[drawingId].merge({ state: newState })

// ❌ update() — 모든 필드를 새 값으로 덮어씀 (name이 null로 됨)
clientDB.tx.drawings[drawingId].update({ state: newState })
```

DrawingState 구조:
```ts
type DrawingState = Record<string, {
  // tldraw 레코드 필드들
  id: string
  type: string
  x: number; y: number

  // 커스텀 메타
  meta: {
    source: string    // 변경한 사람의 localSourceId
    version: string   // uniqueId() — 충돌 해결용
    deleted?: boolean // Soft Delete 플래그
  }
} | null>

// 예시
{
  'shape:abc': {
    type: 'geo', x: 100, y: 200,
    meta: { source: 'user-xyz', version: 'v-001' }
  },
  'shape:def': {
    type: 'text', text: 'Process A',
    meta: { source: 'user-xyz', version: 'v-002', deleted: true }
  },
}
```

**FlowMat 적용 — 노드 위치만 업데이트:**

```ts
// 현재 FlowMat: 전체 Process 객체를 PUT
PUT /api/processes/{processId}
{ posX: 100, posY: 200, name: '...', colorScheme: '...' ... }

// 개선: 위치만 PATCH
PATCH /api/processes/{processId}/position
{ posX: 100, posY: 200 }
// → WebSocket 브로드캐스트 크기도 작아짐
```

---

## 8. 팀 초대 2-step 플로우

```
Step 1: 초대 생성 (inviteMemberToTeam)
  memberships[id1] { teamId, userEmail, userId: null }  ← 아직 미확정
  invites[id2]     { userEmail, status: undefined }     ← pending

Step 2: 초대 수락 (acceptInvite)
  memberships[id1].userId = currentUser.id              ← 정식 멤버 확정
  invites[id2].status     = "accepted"

Step 3: 권한 적용
  drawings.allow.view = "auth.id in teams.memberships.userId"
  → userId가 설정되었으므로 팀의 모든 드로잉 접근 가능
```

**pending 초대 필터링 (index.tsx):**

```ts
const pendingInvites = useMemo(() => {
  const myTeamIds = new Set(teams?.map(t => t.id))
  return invites?.filter(invite =>
    !myTeamIds.has(invite.teamId) &&  // 아직 멤버 아님
    !invite.status                     // status 없음 = pending
  ) ?? []
}, [invites, teams])
```

---

## 9. 팀 목록 페이지 패턴 (index.tsx)

페이지 구조:
```
/ (index)
├── 받은 초대 목록 (pending만)
│   ├── [수락] → acceptInvite()
│   └── [거절] → declineInvite()
├── 팀 선택 드롭다운
└── 선택된 팀 상세
    ├── 드로잉 생성 버튼 → createDrawingForTeam()
    ├── 멤버 초대 버튼 → inviteMemberToTeam()
    ├── 드로잉 목록 (페이지네이션)
    └── 정식 멤버 목록 (userId != null인 membership만)
```

**페이지네이션 패턴 (limit+1 트릭):**

```ts
// limit+1을 요청해서 다음 페이지 존재 여부 확인
const lookaheadQuery = clientDB.useQuery({
  drawings: {
    $: { where: { 'teams.id': teamId }, limit: PAGE_SIZE + 1, offset: PAGE_SIZE * page }
  }
})

const hasNextPage = lookaheadQuery.data?.drawings.length > drawings.length
```

---

## 10. Spring Boot 구현 가이드

### 10.1 DB 테이블 추가

```sql
-- membership (userId null = 초대 미수락)
ALTER TABLE project_member
  ADD COLUMN user_email VARCHAR(255),
  ADD COLUMN status ENUM('pending', 'active') DEFAULT 'active';

-- invite (2-step 초대)
ALTER TABLE project_invite
  ADD COLUMN membership_id VARCHAR(36),
  ADD COLUMN status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending';
```

### 10.2 초대 플로우 서비스

```java
@Service @Transactional
public class ProjectInviteService {

  // Step 1: 초대 생성
  public ProjectInvite invite(String projectId, String email, String invitedBy) {
    // userId=null인 member 먼저 생성
    ProjectMember pending = new ProjectMember();
    pending.setProjectId(projectId);
    pending.setUserEmail(email);
    pending.setStatus("pending");
    memberRepo.save(pending);

    // invite 생성
    ProjectInvite invite = new ProjectInvite();
    invite.setProjectId(projectId);
    invite.setUserEmail(email);
    invite.setMembershipId(pending.getId());
    invite.setStatus("pending");
    return inviteRepo.save(invite);
  }

  // Step 2: 수락 → membership 확정
  public void accept(String inviteId, String userId, String userEmail) {
    ProjectInvite invite = inviteRepo.findById(inviteId).orElseThrow();

    if (!invite.getUserEmail().equals(userEmail))
      throw new AccessDeniedException("Not your invite");

    ProjectMember member = memberRepo.findById(invite.getMembershipId()).orElseThrow();
    member.setUserId(userId);
    member.setStatus("active");
    memberRepo.save(member);

    invite.setStatus("accepted");
    inviteRepo.save(invite);
  }
}
```

### 10.3 캔버스 상태 동기화 (useInstantStore 대응)

```java
@MessageMapping("/workflow/{workflowId}/update")
public void handleCanvasUpdate(
    @DestinationVariable String workflowId,
    @Payload CanvasUpdateMessage msg,
    Principal principal) {

  // 권한 확인
  if (!permService.isMember(workflowId, principal.getName()))
    throw new AccessDeniedException("Not a member");

  // DB 저장 (throttle: 200ms 배치로 누적 후 저장)
  canvasStateService.scheduleUpdate(workflowId, msg.getChanges());

  // 다른 클라이언트에 브로드캐스트 (본인 제외)
  msg.setSourceId(principal.getName());
  messagingTemplate.convertAndSend(
    "/topic/workflow/" + workflowId,
    msg
  );
}
```

### 10.4 Presence (커서) 서버

```java
// Volatile channel — DB 저장 안 하고 브로드캐스트만
@MessageMapping("/workflow/{workflowId}/presence")
public void handlePresence(
    @DestinationVariable String workflowId,
    @Payload PresenceMessage msg,
    Principal principal) {

  msg.setUserId(principal.getName());
  // 모든 구독자에게 전달 (DB 저장 없음)
  messagingTemplate.convertAndSend(
    "/topic/workflow/" + workflowId + "/presence",
    msg
  );
}
```

---

## 11. 종합 우선순위 테이블

| 기능 | instldraw 파일 | FlowMat 구현 방법 | 우선순위 |
|---|---|---|---|
| 멀티플레이어 커서 | `useInstantPresence.tsx` | WebSocket Volatile channel | ★★★ |
| merge() 패턴 (필드 단위 업데이트) | `mutators.ts` | PATCH /api/processes/{id}/position | ★★★ |
| 변경 감지 + 스로틀 | `useInstantStore.tsx` | 200ms debounce + WebSocket | ★★★ |
| 원격 변경 충돌 해결 | `syncInstantStateToTldrawStore` | source + version 비교 | ★★★ |
| Soft Delete 패턴 | `tldrawEventToStateSlice` | deleted 플래그 + 필터링 | ★★☆ |
| 2-step 초대 플로우 | `mutators.ts` (inviteMemberToTeam) | ProjectInviteService 구현 | ★★☆ |
| 팀 관리 UI 패턴 | `pages/index.tsx` | ProjectListPage 개선 | ★★☆ |
| pending 초대 필터링 | `index.tsx` (pendingInvites) | status='pending' 조회 | ★★☆ |
| 페이지네이션 limit+1 트릭 | `index.tsx` | Spring Page + hasNext | ★☆☆ |
| Presence 권한 분리 | `instant.schema.ts` (rooms) | Volatile WebSocket 채널 | ★☆☆ |

---

## 12. 요약

instldraw가 약 **400줄**로 구현한 전체 팀 협업 기능을  
FlowMat(Spring Boot)에서 구현하려면 **약 3,000줄+**가 필요하다.  
하지만 설계 패턴은 그대로 따를 수 있다:

| instldraw 개념 | FlowMat 구현 |
|---|---|
| InstantDB `subscribeQuery` | Spring WebSocket + Durable channel |
| InstantDB `rooms.presence` | Spring WebSocket + Volatile channel |
| `merge()` | Spring PATCH endpoint (부분 업데이트) |
| `throttle(200ms)` | 프론트 debounce + 배치 전송 |
| `source + version` 충돌 해결 | 동일 패턴 적용 |
| `instant.perms.ts` | Spring Security @PreAuthorize |
| `memberships.userId=null` | project_member.status='pending' |
