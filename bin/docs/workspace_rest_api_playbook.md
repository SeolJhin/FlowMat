# Workspace REST API Playbook

## English

### Purpose

This document is the implementation playbook for the MVP workspace frontend.

It defines:

- exact REST request and response shapes
- query invalidation policy
- optimistic update policy
- error handling policy

This document assumes a RESTful React client using:

- `fetch` or `axios`
- TanStack Query
- React Flow

### API Base Rules

Base path:

- `/api`

Response envelope:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Error envelope:

```json
{
  "success": false,
  "data": null,
  "message": "Bad request"
}
```

Important current backend behavior:

- success responses always use `ApiResponse.ok`
- business and validation errors return `ApiResponse.error`
- error payload currently has no dedicated `code` field
- frontend should derive error classification from HTTP status plus `message`

### Core Workspace Endpoints

- `GET /api/workflows/{workflowId}`
- `GET /api/workflows/{workflowId}/canvas`
- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`
- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`
- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`
- `GET /api/flow-rules`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

### Example 1: Get Workflow Canvas

Request:

```http
GET /api/workflows/wf_001/canvas
```

Response:

```json
{
  "success": true,
  "data": {
    "workflow": {
      "workflowId": "wf_001",
      "projectId": "prj_001",
      "workflowName": "Main Flow",
      "workflowDesc": "Primary manufacturing flow",
      "workflowType": "main",
      "workflowStatus": "active"
    },
    "processes": [
      {
        "processId": "proc_mix",
        "projectId": "prj_001",
        "workflowId": "wf_001",
        "processName": "Mixing",
        "processType": "mixing",
        "nodeType": "process",
        "processStatus": "active",
        "colorScheme": "amber",
        "posX": 120.0,
        "posY": 80.0,
        "width": 160.0,
        "height": 80.0,
        "processDesc": "Blend raw materials"
      }
    ],
    "processIos": [
      {
        "processIoId": "pio_in_01",
        "processId": "proc_mix",
        "itemId": "item_powder",
        "ioName": "Powder Input",
        "direction": "input",
        "ioType": "material",
        "quantity": 10.0,
        "unit": "kg",
        "formula": null,
        "colorScheme": "sky",
        "requiredYn": "Y",
        "allowShortageYn": "N"
      }
    ],
    "connections": [
      {
        "connectionId": "conn_001",
        "projectId": "prj_001",
        "workflowId": "wf_001",
        "fromProcessId": "proc_mix",
        "toProcessId": "proc_heat",
        "fromIoId": "pio_out_01",
        "toIoId": "pio_in_02",
        "itemId": "item_mix",
        "sourceHandle": "pio_out_01",
        "targetHandle": "pio_in_02",
        "connectionType": "material",
        "connectionLabel": "Mixed Feed",
        "flowRate": 12.5,
        "unit": "kg",
        "delayTimeSec": 0.0,
        "lossRate": 0.0,
        "priority": 0
      }
    ]
  },
  "message": null
}
```

Frontend use:

- hydrate `WorkflowCanvasViewModel`
- derive node and port lookup maps
- render React Flow nodes and edges

### Example 2: Create Process Node

Request:

```http
POST /api/processes
Content-Type: application/json
```

```json
{
  "workflowId": "wf_001",
  "processName": "Heating",
  "processType": "heating",
  "nodeType": "process",
  "colorScheme": "red",
  "posX": 420.0,
  "posY": 80.0,
  "width": 160.0,
  "height": 80.0,
  "processDesc": "Apply heat treatment"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "processId": "proc_heat",
    "projectId": "prj_001",
    "workflowId": "wf_001",
    "processName": "Heating",
    "processType": "heating",
    "nodeType": "process",
    "processStatus": "active",
    "colorScheme": "red",
    "posX": 420.0,
    "posY": 80.0,
    "width": 160.0,
    "height": 80.0,
    "processDesc": "Apply heat treatment"
  },
  "message": null
}
```

Frontend policy:

- no optimistic create for node creation in MVP
- wait for server response
- invalidate `['workflow-canvas', workflowId]`

### Example 3: Update Node Position

Request:

```http
PUT /api/processes/proc_heat
Content-Type: application/json
```

```json
{
  "posX": 460.0,
  "posY": 120.0
}
```

Frontend policy:

- optimistic update allowed
- patch local node position immediately
- rollback if request fails
- invalidate `['workflow-canvas', workflowId]` after settle

### Example 4: Update Node Color

Request:

```http
PUT /api/processes/proc_heat
Content-Type: application/json
```

```json
{
  "colorScheme": "orange"
}
```

Frontend policy:

- optimistic update allowed
- use debounce only for drag-style color picker
- if using click-to-select palette, submit immediately

### Example 5: Create Process I/O

Request:

```http
POST /api/process-ios
Content-Type: application/json
```

```json
{
  "processId": "proc_heat",
  "itemId": "item_mix",
  "ioName": "Mixed Feed",
  "direction": "input",
  "ioType": "material",
  "quantity": 12.5,
  "unit": "kg",
  "formula": null,
  "colorScheme": "sky",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

Frontend policy:

- no optimistic create in MVP
- server returns canonical I/O id
- invalidate `['workflow-canvas', workflowId]`

### Example 6: Create Connection

Request:

```http
POST /api/process-connections
Content-Type: application/json
```

```json
{
  "workflowId": "wf_001",
  "fromProcessId": "proc_mix",
  "toProcessId": "proc_heat",
  "fromIoId": "pio_out_01",
  "toIoId": "pio_in_02",
  "itemId": "item_mix",
  "sourceHandle": "pio_out_01",
  "targetHandle": "pio_in_02",
  "connectionType": "material",
  "connectionLabel": "Mixed Feed",
  "flowRate": 12.5,
  "unit": "kg",
  "delayTimeSec": 0,
  "lossRate": 0,
  "priority": 0
}
```

Frontend rules:

- `sourceHandle` and `targetHandle` must be preserved
- when connecting from a node-level default port, use:
  - `out-default`
  - `in-default`
- when connecting from a specific I/O row, use `processIoId` as handle id

### Example 7: Create Rule

Request:

```http
POST /api/flow-rules
Content-Type: application/json
```

```json
{
  "projectId": "prj_001",
  "targetType": "process_io",
  "targetId": "pio_in_02",
  "ruleName": "Prevent negative inventory",
  "ruleDesc": "Input quantity cannot exceed available stock.",
  "conditionType": "expression",
  "conditionExpression": "inventory.quantity >= 0",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

Frontend policy:

- do not optimistic-create rules in MVP
- validation failures are likely
- keep drawer open on error

### Query Invalidation Table

| Mutation | Invalidate |
|---|---|
| create process | `['workflow-canvas', workflowId]`, `['workflow', workflowId]` |
| update process | `['workflow-canvas', workflowId]` |
| delete process | `['workflow-canvas', workflowId]` |
| create process io | `['workflow-canvas', workflowId]` |
| update process io | `['workflow-canvas', workflowId]` |
| delete process io | `['workflow-canvas', workflowId]` |
| create connection | `['workflow-canvas', workflowId]` |
| update connection | `['workflow-canvas', workflowId]` |
| delete connection | `['workflow-canvas', workflowId]` |
| create rule | `['flow-rules', projectId, targetType, targetId]` |
| update rule | `['flow-rules', projectId, targetType, targetId]` |
| delete rule | `['flow-rules', projectId, targetType, targetId]` |

Guideline:

- prefer invalidating the canvas root query
- avoid partial client-side graph patching until the workspace is stable

### Optimistic Update Matrix

| Operation | Optimistic | Reason |
|---|---|---|
| node move | yes | rollback is simple |
| node color change | yes | rollback is simple |
| node rename | yes | rollback is simple |
| connection label change | yes | rollback is simple |
| create node | no | server id required |
| create I/O row | no | server id required |
| create connection | no | handle and relation validation required |
| create rule | no | validation likely to fail |
| delete node | no | graph side effects too broad |

### Error Handling Matrix

| Case | HTTP | Envelope | Frontend handling |
|---|---|---|---|
| rule validation failure | `400` | `success=false`, custom `message` | keep drawer or draft open, show inline error |
| invalid form body | `400` | `success=false`, field message when available | map to form-level error, keep form values |
| missing resource | `404` | `success=false`, `message="Resource not found"` | show toast, refetch parent screen, clear stale selection |
| unexpected server error | `500` | `success=false`, `message="Internal server error"` | show generic toast, allow retry |

Important current backend note:

- there is no structured error code field in the JSON body
- use HTTP status as the primary branch key
- use `message` as user-facing fallback text

### UI Error Normalization

Recommended frontend normalization:

```ts
type UiError = {
  httpStatus: number
  message: string
  kind: 'validation' | 'not_found' | 'forbidden' | 'unknown'
}
```

Suggested mapping:

- `400` -> `validation`
- `404` -> `not_found`
- `403` -> `forbidden`
- anything else -> `unknown`

### Hook-by-Hook Guidance

#### `useWorkflowCanvasQuery`

- fetch `GET /api/workflows/{workflowId}/canvas`
- convert DTO to `WorkflowCanvasViewModel`
- expose stable `nodes`, `edges`, `nodeMap`, `portMap`

#### `useUpdateProcessPosition`

- local optimistic patch
- rollback on failure
- invalidate canvas after settle

#### `useCreateProcessConnection`

- no optimistic create
- submit only from confirmed connection draft
- preserve `sourceHandle` and `targetHandle`
- on failure, return user to connection draft state when possible

#### `useCreateFlowRule`

- no optimistic create
- keep builder state local until success
- invalidate only the affected rule query

### Frontend Anti-Patterns

Do not:

- submit one giant workspace blob
- hide REST resources behind fake RPC names
- directly mutate React Flow state without query reconciliation
- assume error `message` is always field-specific

### Next Step

The next useful document should be:

`workspace_live_api_checklist`

That document should define:

- sample records to seed
- exact manual test steps
- expected API responses
- failure cases to trigger intentionally

---

## Korean Translation

### 목적

이 문서는 MVP 워크스페이스 프론트엔드를 위한 구현 플레이북이다.

다음을 정의한다.

- 정확한 REST request, response 형태
- query invalidation 정책
- optimistic update 정책
- error handling 정책

이 문서는 다음 기반을 전제로 한다.

- `fetch` 또는 `axios`
- TanStack Query
- React Flow

### API 기본 규칙

기본 경로:

- `/api`

응답 래퍼:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

에러 래퍼:

```json
{
  "success": false,
  "data": null,
  "message": "Bad request"
}
```

현재 백엔드의 중요한 동작:

- 성공 응답은 항상 `ApiResponse.ok`
- business, validation 에러는 `ApiResponse.error`
- 현재 에러 payload에는 별도 `code` 필드가 없다
- 프론트는 HTTP status와 `message`를 함께 보고 분기해야 한다

### 핵심 워크스페이스 엔드포인트

- `GET /api/workflows/{workflowId}`
- `GET /api/workflows/{workflowId}/canvas`
- `POST /api/processes`
- `PUT /api/processes/{processId}`
- `DELETE /api/processes/{processId}`
- `POST /api/process-ios`
- `PUT /api/process-ios/{processIoId}`
- `DELETE /api/process-ios/{processIoId}`
- `POST /api/process-connections`
- `PUT /api/process-connections/{connectionId}`
- `DELETE /api/process-connections/{connectionId}`
- `GET /api/flow-rules`
- `POST /api/flow-rules`
- `PUT /api/flow-rules/{ruleId}`
- `DELETE /api/flow-rules/{ruleId}`

### 예시 1: 워크플로우 캔버스 조회

요청:

```http
GET /api/workflows/wf_001/canvas
```

응답:

```json
{
  "success": true,
  "data": {
    "workflow": {
      "workflowId": "wf_001",
      "projectId": "prj_001",
      "workflowName": "Main Flow",
      "workflowDesc": "Primary manufacturing flow",
      "workflowType": "main",
      "workflowStatus": "active"
    },
    "processes": [
      {
        "processId": "proc_mix",
        "projectId": "prj_001",
        "workflowId": "wf_001",
        "processName": "Mixing",
        "processType": "mixing",
        "nodeType": "process",
        "processStatus": "active",
        "colorScheme": "amber",
        "posX": 120.0,
        "posY": 80.0,
        "width": 160.0,
        "height": 80.0,
        "processDesc": "Blend raw materials"
      }
    ],
    "processIos": [
      {
        "processIoId": "pio_in_01",
        "processId": "proc_mix",
        "itemId": "item_powder",
        "ioName": "Powder Input",
        "direction": "input",
        "ioType": "material",
        "quantity": 10.0,
        "unit": "kg",
        "formula": null,
        "colorScheme": "sky",
        "requiredYn": "Y",
        "allowShortageYn": "N"
      }
    ],
    "connections": [
      {
        "connectionId": "conn_001",
        "projectId": "prj_001",
        "workflowId": "wf_001",
        "fromProcessId": "proc_mix",
        "toProcessId": "proc_heat",
        "fromIoId": "pio_out_01",
        "toIoId": "pio_in_02",
        "itemId": "item_mix",
        "sourceHandle": "pio_out_01",
        "targetHandle": "pio_in_02",
        "connectionType": "material",
        "connectionLabel": "Mixed Feed",
        "flowRate": 12.5,
        "unit": "kg",
        "delayTimeSec": 0.0,
        "lossRate": 0.0,
        "priority": 0
      }
    ]
  },
  "message": null
}
```

프론트 사용 방식:

- `WorkflowCanvasViewModel`로 변환
- node, port lookup map 생성
- React Flow 노드와 엣지 렌더링

### 예시 2: 프로세스 노드 생성

요청:

```http
POST /api/processes
Content-Type: application/json
```

```json
{
  "workflowId": "wf_001",
  "processName": "Heating",
  "processType": "heating",
  "nodeType": "process",
  "colorScheme": "red",
  "posX": 420.0,
  "posY": 80.0,
  "width": 160.0,
  "height": 80.0,
  "processDesc": "Apply heat treatment"
}
```

성공 응답:

```json
{
  "success": true,
  "data": {
    "processId": "proc_heat",
    "projectId": "prj_001",
    "workflowId": "wf_001",
    "processName": "Heating",
    "processType": "heating",
    "nodeType": "process",
    "processStatus": "active",
    "colorScheme": "red",
    "posX": 420.0,
    "posY": 80.0,
    "width": 160.0,
    "height": 80.0,
    "processDesc": "Apply heat treatment"
  },
  "message": null
}
```

프론트 정책:

- 노드 생성은 MVP에서 optimistic create를 하지 않는다
- 서버 응답을 기다린다
- `['workflow-canvas', workflowId]`를 invalidate한다

### 예시 3: 노드 위치 수정

요청:

```http
PUT /api/processes/proc_heat
Content-Type: application/json
```

```json
{
  "posX": 460.0,
  "posY": 120.0
}
```

프론트 정책:

- optimistic update 허용
- 로컬 노드 위치를 즉시 패치
- 실패 시 rollback
- settle 후 canvas invalidate

### 예시 4: 노드 색상 수정

요청:

```http
PUT /api/processes/proc_heat
Content-Type: application/json
```

```json
{
  "colorScheme": "orange"
}
```

프론트 정책:

- optimistic update 허용
- drag 스타일 color picker면 debounce 가능
- click 선택형 palette면 즉시 submit

### 예시 5: Process I/O 생성

요청:

```http
POST /api/process-ios
Content-Type: application/json
```

```json
{
  "processId": "proc_heat",
  "itemId": "item_mix",
  "ioName": "Mixed Feed",
  "direction": "input",
  "ioType": "material",
  "quantity": 12.5,
  "unit": "kg",
  "formula": null,
  "colorScheme": "sky",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

프론트 정책:

- MVP에서는 optimistic create를 하지 않는다
- 서버가 canonical I/O id를 돌려준다
- `['workflow-canvas', workflowId]` invalidate

### 예시 6: 연결 생성

요청:

```http
POST /api/process-connections
Content-Type: application/json
```

```json
{
  "workflowId": "wf_001",
  "fromProcessId": "proc_mix",
  "toProcessId": "proc_heat",
  "fromIoId": "pio_out_01",
  "toIoId": "pio_in_02",
  "itemId": "item_mix",
  "sourceHandle": "pio_out_01",
  "targetHandle": "pio_in_02",
  "connectionType": "material",
  "connectionLabel": "Mixed Feed",
  "flowRate": 12.5,
  "unit": "kg",
  "delayTimeSec": 0,
  "lossRate": 0,
  "priority": 0
}
```

프론트 규칙:

- `sourceHandle`, `targetHandle`는 반드시 유지
- 노드 기본 포트에서 연결하면 다음을 사용
  - `out-default`
  - `in-default`
- 특정 I/O row에서 연결하면 `processIoId`를 handle id로 사용

### 예시 7: 규칙 생성

요청:

```http
POST /api/flow-rules
Content-Type: application/json
```

```json
{
  "projectId": "prj_001",
  "targetType": "process_io",
  "targetId": "pio_in_02",
  "ruleName": "Prevent negative inventory",
  "ruleDesc": "Input quantity cannot exceed available stock.",
  "conditionType": "expression",
  "conditionExpression": "inventory.quantity >= 0",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

프론트 정책:

- 규칙 생성은 MVP에서 optimistic create를 하지 않는다
- validation 실패 가능성이 높다
- 에러 시 drawer를 닫지 않는다

### Query Invalidation 표

| Mutation | Invalidate |
|---|---|
| create process | `['workflow-canvas', workflowId]`, `['workflow', workflowId]` |
| update process | `['workflow-canvas', workflowId]` |
| delete process | `['workflow-canvas', workflowId]` |
| create process io | `['workflow-canvas', workflowId]` |
| update process io | `['workflow-canvas', workflowId]` |
| delete process io | `['workflow-canvas', workflowId]` |
| create connection | `['workflow-canvas', workflowId]` |
| update connection | `['workflow-canvas', workflowId]` |
| delete connection | `['workflow-canvas', workflowId]` |
| create rule | `['flow-rules', projectId, targetType, targetId]` |
| update rule | `['flow-rules', projectId, targetType, targetId]` |
| delete rule | `['flow-rules', projectId, targetType, targetId]` |

가이드라인:

- 우선 canvas 루트 query invalidate를 사용한다
- 워크스페이스가 안정되기 전까지 과도한 부분 graph patching은 피한다

### Optimistic Update 매트릭스

| Operation | Optimistic | Reason |
|---|---|---|
| node move | yes | rollback이 단순 |
| node color change | yes | rollback이 단순 |
| node rename | yes | rollback이 단순 |
| connection label change | yes | rollback이 단순 |
| create node | no | server id 필요 |
| create I/O row | no | server id 필요 |
| create connection | no | handle, relation validation 필요 |
| create rule | no | validation 실패 가능성 높음 |
| delete node | no | graph side effect 범위 큼 |

### Error Handling 매트릭스

| Case | HTTP | Envelope | Frontend handling |
|---|---|---|---|
| rule validation failure | `400` | `success=false`, custom `message` | drawer 또는 draft 유지, inline error 표시 |
| invalid form body | `400` | `success=false`, 가능하면 field message | form-level error 매핑, 현재 값 유지 |
| missing resource | `404` | `success=false`, `message="Resource not found"` | toast 표시, 부모 화면 refetch, stale selection 해제 |
| unexpected server error | `500` | `success=false`, `message="Internal server error"` | generic toast 표시, retry 허용 |

현재 백엔드 주의점:

- JSON body에 구조화된 error code 필드는 없다
- 1차 분기는 HTTP status로 한다
- `message`는 사용자 표시용 fallback으로 사용한다

### UI Error 정규화

권장 프론트 정규화:

```ts
type UiError = {
  httpStatus: number
  message: string
  kind: 'validation' | 'not_found' | 'forbidden' | 'unknown'
}
```

권장 매핑:

- `400` -> `validation`
- `404` -> `not_found`
- `403` -> `forbidden`
- 그 외 -> `unknown`

### Hook별 가이드

#### `useWorkflowCanvasQuery`

- `GET /api/workflows/{workflowId}/canvas` 호출
- DTO를 `WorkflowCanvasViewModel`로 변환
- 안정적인 `nodes`, `edges`, `nodeMap`, `portMap` 노출

#### `useUpdateProcessPosition`

- 로컬 optimistic patch
- 실패 시 rollback
- settle 후 canvas invalidate

#### `useCreateProcessConnection`

- optimistic create 없음
- connection draft 확인 후에만 submit
- `sourceHandle`, `targetHandle` 유지
- 실패 시 가능하면 connection draft 상태로 복귀

#### `useCreateFlowRule`

- optimistic create 없음
- 성공 전까지 builder 상태는 로컬 유지
- 영향받은 규칙 query만 invalidate

### 프론트 안티패턴

하지 말 것:

- 거대한 workspace blob 한 번에 submit
- REST 리소스를 가짜 RPC 이름으로 숨기기
- query 정합성 없이 React Flow state 직접 mutate
- error `message`가 항상 field-specific이라고 가정

### 다음 단계

다음으로 유용한 문서는 다음이다.

`workspace_live_api_checklist`

그 문서에는 다음이 들어가야 한다.

- seed할 sample record
- 정확한 수동 테스트 절차
- 기대 API 응답
- 의도적으로 발생시킬 실패 케이스
