# Workspace Live API Checklist

## English

### Purpose

This document defines the manual live API verification checklist for the workspace MVP.

It covers:

- sample records to create
- exact manual test sequence
- expected API behavior
- intentional failure cases

This checklist is meant for frontend development against the real backend, not for abstract planning.

### Important Scope Note

This checklist is for workspace-facing APIs:

- project
- workflow
- process
- process_io
- process_connection
- process_template
- flow_rule CRUD

Current backend limitation:

- rule runtime evaluation is not wired into process, process I/O, or connection mutations
- rule runtime is currently meaningful in inventory and run flows

So for workspace scope, rules are currently verified as:

- create
- list
- update
- delete
- target binding correctness

Not yet as:

- blocking node edit
- blocking connection create
- blocking canvas mutation

### Environment Assumptions

- backend is running locally
- base URL is `http://localhost:8080/api`
- PostgreSQL schema already reflects current `project.sql`
- template seed initializer has run successfully

### Seeded Template IDs Expected

These template IDs should already exist:

- `pr_tpl_mfg_mixing`
- `pr_tpl_mfg_heating`
- `pr_tpl_mfg_packaging`
- `pr_tpl_sw_parser`
- `pr_tpl_sw_validator`
- `pr_tpl_sw_transformer`
- `pr_tpl_sw_storage`

If they do not exist, stop and verify seed execution first.

### Test Record Set

Use one dedicated test namespace.

Recommended values:

- project name: `Workspace MVP Demo`
- owner id: `demo-owner`
- workflow name: `Assembly Flow`
- item 1 code: `RM-POWDER`
- item 1 name: `Powder`
- item 2 code: `FG-MIX`
- item 2 name: `Mixed Output`

### Record Creation Sequence

Create records in this order.

1. project
2. workflow
3. items
4. nodes
5. I/O rows
6. connections
7. rules
8. template-applied node

Always capture returned ids from the server and reuse them.

### Step 1: Create Project

Request:

```http
POST /api/projects
```

```json
{
  "projectName": "Workspace MVP Demo",
  "ownerId": "demo-owner",
  "projectDesc": "Manual verification project",
  "visibility": "private"
}
```

Verify:

- HTTP success
- response envelope `success=true`
- returned `projectId` exists

Store:

- `projectId`

### Step 2: Create Workflow

Request:

```http
POST /api/workflows
```

```json
{
  "projectId": "<projectId>",
  "workflowName": "Assembly Flow",
  "workflowDesc": "Workspace live API checklist flow",
  "workflowType": "main"
}
```

Verify:

- `workflowId` returned
- `projectId` matches the project created above

Store:

- `workflowId`

### Step 3: Create Items

Create at least two items.

Item A:

```http
POST /api/items
```

```json
{
  "projectId": "<projectId>",
  "itemCode": "RM-POWDER",
  "itemName": "Powder",
  "itemType": "raw_material",
  "resourceCategory": "material",
  "resourceType": "powder",
  "unitId": null,
  "itemStatus": "active"
}
```

Item B:

```json
{
  "projectId": "<projectId>",
  "itemCode": "FG-MIX",
  "itemName": "Mixed Output",
  "itemType": "finished_good",
  "resourceCategory": "material",
  "resourceType": "mixture",
  "unitId": null,
  "itemStatus": "active"
}
```

Verify:

- both `itemId` values are returned
- `GET /api/items?projectId=<projectId>` includes both records

Store:

- `itemPowderId`
- `itemMixedId`

### Step 4: Create Two Nodes

Create node 1:

```http
POST /api/processes
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "Mixing",
  "processType": "mixing",
  "nodeType": "process",
  "colorScheme": "amber",
  "posX": 120,
  "posY": 120,
  "width": 160,
  "height": 80,
  "processDesc": "Blend raw material"
}
```

Create node 2:

```json
{
  "workflowId": "<workflowId>",
  "processName": "Heating",
  "processType": "heating",
  "nodeType": "process",
  "colorScheme": "red",
  "posX": 420,
  "posY": 120,
  "width": 160,
  "height": 80,
  "processDesc": "Apply heat"
}
```

Verify:

- both `processId` values return
- `GET /api/processes?workflowId=<workflowId>` returns both nodes

Store:

- `mixingProcessId`
- `heatingProcessId`

### Step 5: Create I/O Rows

Create output on node 1:

```http
POST /api/process-ios
```

```json
{
  "processId": "<mixingProcessId>",
  "itemId": "<itemMixedId>",
  "ioName": "Mixed Output",
  "direction": "output",
  "ioType": "material",
  "quantity": 10,
  "unit": "kg",
  "formula": null,
  "colorScheme": "emerald",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

Create input on node 2:

```json
{
  "processId": "<heatingProcessId>",
  "itemId": "<itemMixedId>",
  "ioName": "Mixed Feed",
  "direction": "input",
  "ioType": "material",
  "quantity": 10,
  "unit": "kg",
  "formula": null,
  "colorScheme": "sky",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

Verify:

- output row returns `direction=output`
- input row returns `direction=input`
- each row has a `processIoId`
- `GET /api/process-ios?processId=<...>` returns the correct rows

Store:

- `mixingOutputIoId`
- `heatingInputIoId`

### Step 6: Create Connection

Request:

```http
POST /api/process-connections
```

```json
{
  "workflowId": "<workflowId>",
  "fromProcessId": "<mixingProcessId>",
  "toProcessId": "<heatingProcessId>",
  "fromIoId": "<mixingOutputIoId>",
  "toIoId": "<heatingInputIoId>",
  "itemId": "<itemMixedId>",
  "sourceHandle": "<mixingOutputIoId>",
  "targetHandle": "<heatingInputIoId>",
  "connectionType": "material",
  "connectionLabel": "Mixed Feed",
  "flowRate": 10,
  "unit": "kg",
  "delayTimeSec": 0,
  "lossRate": 0,
  "priority": 0
}
```

Verify:

- `connectionId` returns
- `sourceHandle` equals `mixingOutputIoId`
- `targetHandle` equals `heatingInputIoId`
- `GET /api/process-connections?workflowId=<workflowId>` includes the connection

Store:

- `connectionId`

### Step 7: Get Workflow Canvas

Request:

```http
GET /api/workflows/<workflowId>/canvas
```

Verify:

- workflow block is present
- both nodes are present
- both I/O rows are present
- one connection is present
- node colors are present
- I/O colors are present
- `sourceHandle` and `targetHandle` are preserved

This is the main frontend hydration checkpoint.

### Step 8: Update Node Position and Color

Request:

```http
PUT /api/processes/<heatingProcessId>
```

```json
{
  "posX": 500,
  "posY": 180,
  "colorScheme": "orange"
}
```

Verify:

- response contains new position
- response contains new `colorScheme`
- canvas refetch reflects the change

### Step 9: Update I/O Row

Request:

```http
PUT /api/process-ios/<heatingInputIoId>
```

```json
{
  "quantity": 12.5,
  "colorScheme": "cyan"
}
```

Verify:

- response contains `quantity=12.5`
- response contains `colorScheme=cyan`
- canvas refetch reflects the change

### Step 10: Update Connection

Request:

```http
PUT /api/process-connections/<connectionId>
```

```json
{
  "connectionLabel": "Heated Feed",
  "flowRate": 12.5,
  "lossRate": 0.02
}
```

Verify:

- label updates
- `flowRate` updates
- `lossRate` updates
- existing handle ids stay intact

### Step 11: Create Workspace Rule

Request:

```http
POST /api/flow-rules
```

```json
{
  "projectId": "<projectId>",
  "targetType": "process_io",
  "targetId": "<heatingInputIoId>",
  "ruleName": "Heating input threshold",
  "ruleDesc": "Heating input should stay under expected threshold.",
  "conditionType": "expression",
  "conditionExpression": "processIo.quantity <= 20",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

Verify:

- rule is created
- `GET /api/flow-rules?projectId=<projectId>&targetType=process_io&targetId=<heatingInputIoId>` returns it

Important note:

- this verifies rule CRUD and target binding
- it does not yet prove workspace mutation blocking behavior

### Step 12: Apply Process Template

Request:

```http
POST /api/process-templates/pr_tpl_mfg_packaging/apply
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "Packaging",
  "colorScheme": "emerald",
  "posX": 760,
  "posY": 120
}
```

Verify:

- new process is returned
- default sizing is applied
- color is present
- canvas refetch shows the inserted node

### Intentional Failure Cases

Use these to verify frontend error handling.

#### Failure 1: Blank Process Name

Request:

```http
POST /api/processes
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "",
  "processType": "mixing"
}
```

Expect:

- HTTP `400`
- `success=false`
- `message` contains validation text

Frontend expectation:

- form remains open
- field-level or top-level validation shown

#### Failure 2: Cross-Process I/O Binding

Create a connection using an I/O id that belongs to the wrong process.

Expect:

- HTTP `400`
- `success=false`
- message may be generic `Bad request`

Frontend expectation:

- connection draft should not disappear silently
- user should see a connection error toast or inline error

#### Failure 3: Missing Resource

Request:

```http
GET /api/processes/does-not-exist
```

Expect:

- HTTP `404`
- `success=false`
- `message="Resource not found"`

Frontend expectation:

- stale selection should be cleared
- user should get a non-blocking error notice

#### Failure 4: Invalid Rule Create Body

Request:

```http
POST /api/flow-rules
```

```json
{
  "projectId": "<projectId>",
  "targetType": "process_io",
  "targetId": "",
  "ruleName": "",
  "conditionExpression": ""
}
```

Expect:

- HTTP `400`
- `success=false`
- message contains validation text

Frontend expectation:

- rule drawer stays open
- current form state is preserved

### Optional Runtime Rule Check

If you also test inventory or run screens, use them to verify custom rule messages because runtime rule enforcement currently lives there.

This is optional for workspace UI delivery, but useful for full product validation.

### Sign-Off Criteria

The workspace live API checklist is complete when:

- all 12 happy-path steps pass
- all 4 failure cases produce stable frontend-visible errors
- canvas reload preserves node, I/O, and connection identity correctly
- template-applied nodes behave like normal nodes after insertion

### Next Document

The next useful document should be:

`frontend_bootstrap_execution_plan`

That document should translate the implementation sequence into an actual first coding sprint plan.

---

## Korean Translation

### 목적

이 문서는 워크스페이스 MVP를 위한 수동 live API 검증 체크리스트다.

다음을 다룬다.

- 생성할 샘플 데이터
- 정확한 수동 테스트 순서
- 기대 API 동작
- 의도적인 실패 케이스

이 체크리스트는 추상 계획이 아니라, 실제 백엔드에 붙는 프론트 개발을 위한 문서다.

### 중요한 범위 메모

이 체크리스트는 다음 workspace API를 대상으로 한다.

- project
- workflow
- process
- process_io
- process_connection
- process_template
- flow_rule CRUD

현재 백엔드 제한:

- rule runtime evaluation은 아직 process, process I/O, connection mutation에 연결돼 있지 않다
- rule runtime은 현재 inventory와 run 흐름에서 의미 있게 동작한다

따라서 workspace 범위에서 rules는 현재 다음을 검증한다.

- create
- list
- update
- delete
- target binding 정확성

아직 검증하지 않는 것:

- node edit 차단
- connection create 차단
- canvas mutation 차단

### 환경 전제

- 백엔드가 로컬에서 실행 중
- base URL은 `http://localhost:8080/api`
- PostgreSQL 스키마가 현재 `project.sql`과 일치
- template seed initializer가 정상 실행됨

### 기대되는 시드 템플릿 ID

다음 template ID가 이미 존재해야 한다.

- `pr_tpl_mfg_mixing`
- `pr_tpl_mfg_heating`
- `pr_tpl_mfg_packaging`
- `pr_tpl_sw_parser`
- `pr_tpl_sw_validator`
- `pr_tpl_sw_transformer`
- `pr_tpl_sw_storage`

없다면 seed 실행부터 확인하고 진행해야 한다.

### 테스트 레코드 세트

하나의 전용 테스트 namespace를 사용한다.

권장 값:

- project name: `Workspace MVP Demo`
- owner id: `demo-owner`
- workflow name: `Assembly Flow`
- item 1 code: `RM-POWDER`
- item 1 name: `Powder`
- item 2 code: `FG-MIX`
- item 2 name: `Mixed Output`

### 레코드 생성 순서

다음 순서로 생성한다.

1. project
2. workflow
3. items
4. nodes
5. I/O rows
6. connections
7. rules
8. template-applied node

서버가 반환한 id는 반드시 저장해서 재사용한다.

### Step 1: Project 생성

요청:

```http
POST /api/projects
```

```json
{
  "projectName": "Workspace MVP Demo",
  "ownerId": "demo-owner",
  "projectDesc": "Manual verification project",
  "visibility": "private"
}
```

검증:

- HTTP 성공
- 응답 래퍼 `success=true`
- 반환된 `projectId` 존재

저장:

- `projectId`

### Step 2: Workflow 생성

요청:

```http
POST /api/workflows
```

```json
{
  "projectId": "<projectId>",
  "workflowName": "Assembly Flow",
  "workflowDesc": "Workspace live API checklist flow",
  "workflowType": "main"
}
```

검증:

- `workflowId` 반환
- `projectId`가 방금 생성한 프로젝트와 일치

저장:

- `workflowId`

### Step 3: Item 생성

최소 두 개의 item을 만든다.

Item A:

```http
POST /api/items
```

```json
{
  "projectId": "<projectId>",
  "itemCode": "RM-POWDER",
  "itemName": "Powder",
  "itemType": "raw_material",
  "resourceCategory": "material",
  "resourceType": "powder",
  "unitId": null,
  "itemStatus": "active"
}
```

Item B:

```json
{
  "projectId": "<projectId>",
  "itemCode": "FG-MIX",
  "itemName": "Mixed Output",
  "itemType": "finished_good",
  "resourceCategory": "material",
  "resourceType": "mixture",
  "unitId": null,
  "itemStatus": "active"
}
```

검증:

- 두 `itemId` 모두 반환
- `GET /api/items?projectId=<projectId>`에 두 레코드 모두 포함

저장:

- `itemPowderId`
- `itemMixedId`

### Step 4: 노드 두 개 생성

노드 1 생성:

```http
POST /api/processes
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "Mixing",
  "processType": "mixing",
  "nodeType": "process",
  "colorScheme": "amber",
  "posX": 120,
  "posY": 120,
  "width": 160,
  "height": 80,
  "processDesc": "Blend raw material"
}
```

노드 2 생성:

```json
{
  "workflowId": "<workflowId>",
  "processName": "Heating",
  "processType": "heating",
  "nodeType": "process",
  "colorScheme": "red",
  "posX": 420,
  "posY": 120,
  "width": 160,
  "height": 80,
  "processDesc": "Apply heat"
}
```

검증:

- 두 `processId` 반환
- `GET /api/processes?workflowId=<workflowId>`에 두 노드 모두 포함

저장:

- `mixingProcessId`
- `heatingProcessId`

### Step 5: I/O Row 생성

노드 1에 output 생성:

```http
POST /api/process-ios
```

```json
{
  "processId": "<mixingProcessId>",
  "itemId": "<itemMixedId>",
  "ioName": "Mixed Output",
  "direction": "output",
  "ioType": "material",
  "quantity": 10,
  "unit": "kg",
  "formula": null,
  "colorScheme": "emerald",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

노드 2에 input 생성:

```json
{
  "processId": "<heatingProcessId>",
  "itemId": "<itemMixedId>",
  "ioName": "Mixed Feed",
  "direction": "input",
  "ioType": "material",
  "quantity": 10,
  "unit": "kg",
  "formula": null,
  "colorScheme": "sky",
  "requiredYn": "Y",
  "allowShortageYn": "N"
}
```

검증:

- output row는 `direction=output`
- input row는 `direction=input`
- 각 row에 `processIoId` 존재
- `GET /api/process-ios?processId=<...>`에 올바른 row가 포함

저장:

- `mixingOutputIoId`
- `heatingInputIoId`

### Step 6: Connection 생성

요청:

```http
POST /api/process-connections
```

```json
{
  "workflowId": "<workflowId>",
  "fromProcessId": "<mixingProcessId>",
  "toProcessId": "<heatingProcessId>",
  "fromIoId": "<mixingOutputIoId>",
  "toIoId": "<heatingInputIoId>",
  "itemId": "<itemMixedId>",
  "sourceHandle": "<mixingOutputIoId>",
  "targetHandle": "<heatingInputIoId>",
  "connectionType": "material",
  "connectionLabel": "Mixed Feed",
  "flowRate": 10,
  "unit": "kg",
  "delayTimeSec": 0,
  "lossRate": 0,
  "priority": 0
}
```

검증:

- `connectionId` 반환
- `sourceHandle`이 `mixingOutputIoId`와 일치
- `targetHandle`이 `heatingInputIoId`와 일치
- `GET /api/process-connections?workflowId=<workflowId>`에 연결이 포함

저장:

- `connectionId`

### Step 7: Workflow Canvas 조회

요청:

```http
GET /api/workflows/<workflowId>/canvas
```

검증:

- workflow 블록 존재
- 노드 두 개 존재
- I/O row 두 개 존재
- 연결 한 개 존재
- node color 존재
- I/O color 존재
- `sourceHandle`, `targetHandle` 유지

이 단계가 프론트 hydration의 핵심 체크포인트다.

### Step 8: 노드 위치와 색상 수정

요청:

```http
PUT /api/processes/<heatingProcessId>
```

```json
{
  "posX": 500,
  "posY": 180,
  "colorScheme": "orange"
}
```

검증:

- 응답에 새 위치 반영
- 응답에 새 `colorScheme` 반영
- canvas refetch에 변경 반영

### Step 9: I/O Row 수정

요청:

```http
PUT /api/process-ios/<heatingInputIoId>
```

```json
{
  "quantity": 12.5,
  "colorScheme": "cyan"
}
```

검증:

- 응답에 `quantity=12.5`
- 응답에 `colorScheme=cyan`
- canvas refetch에 변경 반영

### Step 10: Connection 수정

요청:

```http
PUT /api/process-connections/<connectionId>
```

```json
{
  "connectionLabel": "Heated Feed",
  "flowRate": 12.5,
  "lossRate": 0.02
}
```

검증:

- label 변경
- `flowRate` 변경
- `lossRate` 변경
- 기존 handle id 유지

### Step 11: Workspace Rule 생성

요청:

```http
POST /api/flow-rules
```

```json
{
  "projectId": "<projectId>",
  "targetType": "process_io",
  "targetId": "<heatingInputIoId>",
  "ruleName": "Heating input threshold",
  "ruleDesc": "Heating input should stay under expected threshold.",
  "conditionType": "expression",
  "conditionExpression": "processIo.quantity <= 20",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

검증:

- rule 생성
- `GET /api/flow-rules?projectId=<projectId>&targetType=process_io&targetId=<heatingInputIoId>`에 포함

중요:

- 이 단계는 rule CRUD와 target binding을 검증한다
- 아직 workspace mutation blocking을 증명하지는 않는다

### Step 12: Process Template 적용

요청:

```http
POST /api/process-templates/pr_tpl_mfg_packaging/apply
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "Packaging",
  "colorScheme": "emerald",
  "posX": 760,
  "posY": 120
}
```

검증:

- 새 process 반환
- 기본 크기 적용
- color 존재
- canvas refetch에 삽입 노드 보임

### 의도적 실패 케이스

프론트 에러 처리를 검증하기 위해 다음을 사용한다.

#### Failure 1: 빈 Process 이름

요청:

```http
POST /api/processes
```

```json
{
  "workflowId": "<workflowId>",
  "processName": "",
  "processType": "mixing"
}
```

기대:

- HTTP `400`
- `success=false`
- `message`에 validation 문구 포함

프론트 기대 동작:

- form 유지
- field-level 또는 top-level validation 표시

#### Failure 2: 다른 Process의 I/O를 연결에 바인딩

잘못된 process에 속한 I/O id로 connection을 생성한다.

기대:

- HTTP `400`
- `success=false`
- 메시지는 generic `Bad request`일 수 있음

프론트 기대 동작:

- connection draft가 조용히 사라지면 안 됨
- toast 또는 inline error 표시

#### Failure 3: 없는 Resource 조회

요청:

```http
GET /api/processes/does-not-exist
```

기대:

- HTTP `404`
- `success=false`
- `message="Resource not found"`

프론트 기대 동작:

- stale selection 해제
- 비차단형 에러 노출

#### Failure 4: 잘못된 Rule 생성 본문

요청:

```http
POST /api/flow-rules
```

```json
{
  "projectId": "<projectId>",
  "targetType": "process_io",
  "targetId": "",
  "ruleName": "",
  "conditionExpression": ""
}
```

기대:

- HTTP `400`
- `success=false`
- 메시지에 validation 문구 포함

프론트 기대 동작:

- rule drawer 유지
- 현재 form state 보존

### 선택적 Runtime Rule 체크

inventory 또는 run 화면도 같이 테스트한다면, custom rule message 검증은 그쪽에서 수행한다.

현재 runtime rule enforcement는 그 흐름에 있다.

이 단계는 workspace UI 납품에는 선택 사항이지만, 제품 전체 검증에는 유용하다.

### 사인오프 기준

다음이 만족되면 workspace live API checklist는 완료다.

- happy path 12단계가 모두 통과
- 실패 케이스 4개가 모두 안정적인 프론트 에러로 보임
- canvas reload 후 node, I/O, connection identity가 유지됨
- template 적용 노드가 삽입 후 일반 노드처럼 동작함

### 다음 문서

다음으로 유용한 문서는 다음이다.

`frontend_bootstrap_execution_plan`

그 문서는 구현 순서를 실제 첫 스프린트 작업 계획으로 바꿔야 한다.
