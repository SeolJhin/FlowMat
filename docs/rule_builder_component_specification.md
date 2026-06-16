# Rule Builder Component Specification

## English

### Purpose

This document defines the MVP rule builder component for FlowMat.

The component exists to let users create backend-compatible rules without writing raw expressions manually most of the time.

The first goal is not to build a full scripting system.
The first goal is to build a reliable structured editor for the current backend rule model.

### Backend Rule Model

The current backend rule model is:

- `targetType`
- `targetId`
- `ruleName`
- `ruleDesc`
- `conditionType`
- `conditionExpression`
- `actionType`
- `actionConfig`
- `priority`
- `enabledYn`

Current backend evaluator constraints:

- `conditionType` supports `expression`, `always`, `never`
- `conditionExpression` currently supports one binary comparison
- supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`
- `actionType` currently behaves meaningfully for `validate`, `block`, `reject`

This means the frontend should not pretend a richer runtime exists yet.

### Placement

The rule builder should be reachable from:

1. workspace toolbar
2. node inspector
3. connection inspector
4. run or inventory detail surfaces later

For MVP, a drawer is better than a modal because users need to keep canvas context visible.

### Primary User Goal

The user should be able to express rules like:

- block if inventory quantity is below 0
- block if input quantity is greater than available stock
- block if connection flow rate exceeds allowed capacity
- always block a specific forbidden transition

### Target Types

The UI should support the backend target types already used in the API:

- `project`
- `workflow`
- `process`
- `process_io`
- `process_connection`
- `item`
- `inventory`
- `run`

The target selector should be constrained by entry point.

Examples:

- if opened from node inspector, default target is `process`
- if opened from selected I/O row, default target is `process_io`
- if opened from selected connection, default target is `process_connection`

### Component Layout

Recommended structure:

```text
Rule Builder Drawer
  Header
  Target Section
  Condition Section
  Action Section
  Advanced Section
  Preview Section
  Footer Actions
```

### Header

The header should show:

- create or edit mode
- target summary
- enabled toggle

### Target Section

Fields:

- target type
- target id
- target label summary

Behavior:

- target type can be locked when launched from a contextual surface
- target id should usually be prefilled
- target label should show the human-readable object name when available

### Condition Section

The condition section is the core of MVP.

Use a structured row:

```text
[left operand] [operator] [right operand]
```

Plus a condition mode selector:

- `expression`
- `always`
- `never`

If `always` or `never` is selected:

- disable operand controls
- clear expression preview

### Operand Model

Each operand should support two modes:

1. fact path
2. literal

#### Fact Path Mode

Use a searchable select.

Recommended MVP fact paths:

- `inventory.quantity`
- `inventory.minQuantity`
- `inventory.maxQuantity`
- `process.processType`
- `process.nodeType`
- `process.status`
- `processIo.direction`
- `processIo.ioType`
- `processIo.quantity`
- `connection.flowRate`
- `connection.lossRate`
- `run.runType`
- `run.status`
- `input.quantity`
- `output.quantity`

The actual available list should depend on target type.

#### Literal Mode

Supported literal types:

- number
- text
- boolean
- null

The frontend should serialize literals exactly as the backend evaluator expects:

- strings wrapped in quotes
- numbers without quotes
- booleans as `true` or `false`
- null as `null`

Examples:

- `"active"`
- `10`
- `true`
- `null`

### Operator List

Allowed operators for MVP:

- `==`
- `!=`
- `>`
- `>=`
- `<`
- `<=`

Do not expose unsupported operators like `contains`, `startsWith`, `in`, `and`, `or` yet.

### Expression Serialization

The frontend should serialize the structured condition into:

```text
<left> <operator> <right>
```

Examples:

- `inventory.quantity >= 0`
- `processIo.direction == "input"`
- `connection.flowRate <= 100`

### Action Section

Supported action types for MVP:

- `validate`
- `block`
- `reject`

These can share the same UX for now because the backend currently treats them as blocking validation actions.

Fields:

- action type
- blocking message

The blocking message should map to:

- `ruleDesc` first
- fallback display can use `ruleName`

`actionConfig` can stay optional and hidden behind an advanced section until the backend uses it.

### Advanced Section

Fields:

- priority
- enabled toggle
- raw expression preview
- raw payload preview

Purpose:

- make backend serialization visible
- help debugging
- keep power-user trust high

### Preview Section

Show the final request payload preview:

```json
{
  "targetType": "process_io",
  "targetId": "pio_123",
  "ruleName": "Prevent negative input",
  "ruleDesc": "Input quantity cannot go below zero.",
  "conditionType": "expression",
  "conditionExpression": "processIo.quantity >= 0",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

### Validation Rules

The builder should validate before submit:

- target type required
- target id required
- rule name required
- condition expression required when condition type is `expression`
- operator required when condition type is `expression`
- action type required

Additional frontend validation:

- numeric comparison should prefer numeric literal input
- if literal type is string, wrap in quotes automatically
- if fact path is missing for the selected target context, block submit

### Error Messages

Recommended MVP messages:

- `Select a rule target.`
- `Enter a rule name.`
- `Complete the condition expression.`
- `Select an action type.`
- `This fact path is not available for the selected target.`
- `The backend rejected this rule. Review the expression and try again.`

### Editing Existing Rules

When editing:

- hydrate structured controls from stored fields when possible
- if parsing fails, fall back to raw read-only preview plus manual text mode

This fallback matters because the backend stores only the serialized expression.

### Manual Expression Fallback

MVP should include a secondary raw expression mode for edge cases.

Rules:

- structured mode is default
- raw mode is clearly marked as advanced
- if the user edits raw text directly, structured controls become locked until reset

### State Model

Recommended local state:

```text
ruleBuilderState
  mode
  targetType
  targetId
  ruleName
  ruleDesc
  conditionType
  leftOperandMode
  leftOperandValue
  operator
  rightOperandMode
  rightOperandType
  rightOperandValue
  actionType
  actionConfig
  priority
  enabledYn
  isRawMode
  rawExpression
```

### Interaction Notes

The builder should feel precise and technical, not decorative.

Design direction:

- compact spacing
- strong labels
- visible serialization preview
- low ambiguity
- immediate validation feedback

### Non-Goals

- multi-clause boolean logic
- nested rule groups
- custom functions
- JavaScript or script execution
- rule simulation engine

### Next Step

After this component spec, the next useful document should be:

`workflow_canvas_state_machine`

That document should define:

- selection states
- drag states
- connection draft states
- inline rename states
- optimistic mutation boundaries

---

## Korean Translation

### 목적

이 문서는 FlowMat의 MVP 규칙 빌더 컴포넌트를 정의한다.

이 컴포넌트의 목적은 사용자가 대부분의 경우 raw expression을 직접 쓰지 않고도, 백엔드와 호환되는 규칙을 만들게 하는 것이다.

첫 목표는 완전한 스크립트 시스템이 아니다.
첫 목표는 현재 백엔드 규칙 모델에 맞는 신뢰 가능한 구조화 편집기를 만드는 것이다.

### 백엔드 규칙 모델

현재 백엔드 규칙 모델은 다음과 같다.

- `targetType`
- `targetId`
- `ruleName`
- `ruleDesc`
- `conditionType`
- `conditionExpression`
- `actionType`
- `actionConfig`
- `priority`
- `enabledYn`

현재 백엔드 evaluator 제약:

- `conditionType`은 `expression`, `always`, `never` 지원
- `conditionExpression`은 현재 단일 이항 비교만 지원
- 지원 연산자: `==`, `!=`, `>`, `>=`, `<`, `<=`
- `actionType`은 현재 `validate`, `block`, `reject`에서 의미 있게 동작

즉 프론트는 아직 없는 더 풍부한 런타임이 있는 것처럼 보이면 안 된다.

### 배치 위치

규칙 빌더는 다음 위치에서 열 수 있어야 한다.

1. 워크스페이스 툴바
2. 노드 인스펙터
3. 연결 인스펙터
4. 나중에는 run 또는 inventory 상세

MVP에서는 modal보다 drawer가 더 적합하다. 사용자가 캔버스 맥락을 계속 볼 수 있어야 하기 때문이다.

### 주요 사용자 목표

사용자는 다음 같은 규칙을 표현할 수 있어야 한다.

- 재고 수량이 0 아래로 내려가면 차단
- 입력 수량이 가용 재고보다 크면 차단
- 연결 flow rate가 허용 용량을 넘으면 차단
- 특정 금지 전이를 항상 차단

### 대상 타입

UI는 API에서 이미 사용하는 백엔드 target type을 지원해야 한다.

- `project`
- `workflow`
- `process`
- `process_io`
- `process_connection`
- `item`
- `inventory`
- `run`

target selector는 진입 지점에 따라 제한돼야 한다.

예:

- 노드 인스펙터에서 열면 기본 target은 `process`
- 선택한 I/O row에서 열면 기본 target은 `process_io`
- 선택한 연결에서 열면 기본 target은 `process_connection`

### 컴포넌트 레이아웃

권장 구조:

```text
Rule Builder Drawer
  Header
  Target Section
  Condition Section
  Action Section
  Advanced Section
  Preview Section
  Footer Actions
```

### 헤더

헤더는 다음을 보여야 한다.

- 생성 또는 수정 모드
- 대상 요약
- enabled 토글

### Target 섹션

필드:

- target type
- target id
- target label summary

동작:

- 문맥에서 열렸다면 target type은 잠글 수 있어야 한다
- target id는 보통 미리 채워져야 한다
- 가능하면 사람이 읽을 수 있는 객체 이름도 같이 보여줘야 한다

### Condition 섹션

Condition 섹션이 MVP의 핵심이다.

구조화된 한 줄 형태를 사용한다.

```text
[left operand] [operator] [right operand]
```

추가로 condition mode selector:

- `expression`
- `always`
- `never`

`always` 또는 `never`를 선택하면:

- operand 컨트롤 비활성화
- expression preview 비우기

### Operand 모델

각 operand는 두 가지 모드를 지원해야 한다.

1. fact path
2. literal

#### Fact Path 모드

검색 가능한 select를 사용한다.

권장 MVP fact path:

- `inventory.quantity`
- `inventory.minQuantity`
- `inventory.maxQuantity`
- `process.processType`
- `process.nodeType`
- `process.status`
- `processIo.direction`
- `processIo.ioType`
- `processIo.quantity`
- `connection.flowRate`
- `connection.lossRate`
- `run.runType`
- `run.status`
- `input.quantity`
- `output.quantity`

실제 목록은 target type에 따라 달라져야 한다.

#### Literal 모드

지원 literal 타입:

- number
- text
- boolean
- null

프론트엔드는 literal을 백엔드 evaluator가 기대하는 형식 그대로 직렬화해야 한다.

- 문자열은 따옴표 포함
- 숫자는 따옴표 없이
- boolean은 `true` 또는 `false`
- null은 `null`

예:

- `"active"`
- `10`
- `true`
- `null`

### 연산자 목록

MVP 허용 연산자:

- `==`
- `!=`
- `>`
- `>=`
- `<`
- `<=`

아직 지원하지 않는 `contains`, `startsWith`, `in`, `and`, `or` 같은 연산자는 노출하지 않는다.

### Expression 직렬화

프론트엔드는 구조화된 조건을 다음 형태로 직렬화해야 한다.

```text
<left> <operator> <right>
```

예:

- `inventory.quantity >= 0`
- `processIo.direction == "input"`
- `connection.flowRate <= 100`

### Action 섹션

MVP 지원 action type:

- `validate`
- `block`
- `reject`

현재 백엔드는 이들을 모두 blocking validation action처럼 다루므로, 당장은 같은 UX를 써도 된다.

필드:

- action type
- 차단 메시지

차단 메시지는 다음으로 매핑된다.

- 우선 `ruleDesc`
- fallback 표시값은 `ruleName`

`actionConfig`는 백엔드가 실제 사용하기 전까지 optional로 두고 advanced 섹션 뒤로 숨겨도 된다.

### Advanced 섹션

필드:

- priority
- enabled 토글
- raw expression preview
- raw payload preview

목적:

- 백엔드 직렬화 과정을 보이기
- 디버깅 돕기
- 파워 유저 신뢰 유지하기

### Preview 섹션

최종 요청 payload preview를 보여준다.

```json
{
  "targetType": "process_io",
  "targetId": "pio_123",
  "ruleName": "Prevent negative input",
  "ruleDesc": "Input quantity cannot go below zero.",
  "conditionType": "expression",
  "conditionExpression": "processIo.quantity >= 0",
  "actionType": "block",
  "actionConfig": "{}",
  "priority": 100,
  "enabledYn": "Y"
}
```

### 검증 규칙

제출 전 빌더 검증:

- target type 필수
- target id 필수
- rule name 필수
- condition type이 `expression`이면 condition expression 필수
- condition type이 `expression`이면 operator 필수
- action type 필수

추가 프론트 검증:

- 숫자 비교는 숫자 literal 입력을 우선 유도
- literal type이 string이면 자동으로 따옴표를 감싼다
- 선택한 target 문맥에서 없는 fact path면 제출 차단

### 에러 메시지

권장 MVP 메시지:

- `Select a rule target.`
- `Enter a rule name.`
- `Complete the condition expression.`
- `Select an action type.`
- `This fact path is not available for the selected target.`
- `The backend rejected this rule. Review the expression and try again.`

### 기존 규칙 수정

수정 시:

- 가능하면 저장된 필드에서 구조화 컨트롤로 hydrate
- 파싱 실패 시 raw read-only preview와 manual text mode로 fallback

이 fallback이 중요한 이유는 백엔드가 직렬화된 expression만 저장하기 때문이다.

### 수동 Expression fallback

MVP에도 예외 처리를 위한 보조 raw expression 모드는 필요하다.

규칙:

- 기본은 structured mode
- raw mode는 advanced로 명확히 표시
- 사용자가 raw text를 직접 수정하면 reset 전까지 structured control은 잠금

### 상태 모델

권장 로컬 상태:

```text
ruleBuilderState
  mode
  targetType
  targetId
  ruleName
  ruleDesc
  conditionType
  leftOperandMode
  leftOperandValue
  operator
  rightOperandMode
  rightOperandType
  rightOperandValue
  actionType
  actionConfig
  priority
  enabledYn
  isRawMode
  rawExpression
```

### 인터랙션 메모

빌더는 장식적이기보다 정확하고 기술적인 도구처럼 느껴져야 한다.

디자인 방향:

- 컴팩트한 간격
- 강한 레이블
- 보이는 직렬화 preview
- 낮은 모호성
- 즉시 검증 피드백

### 비목표

- 다중 조건 boolean logic
- 중첩 rule group
- custom function
- JavaScript 또는 스크립트 실행
- rule simulation engine

### 다음 단계

이 컴포넌트 명세 다음으로 유용한 문서는 다음이다.

`workflow_canvas_state_machine`

그 문서는 다음을 정의해야 한다.

- selection state
- drag state
- connection draft state
- inline rename state
- optimistic mutation boundary
