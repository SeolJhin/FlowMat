# FlowMat Frontend — Claude Code Context

> Source documents: `frontend_mvp_architecture.md` · `project_workspace_screen_specification.md` · `canvas_component_contracts.md` · `workspace_rest_api_playbook.md`

---

## Product Vision

FlowMat is a visual flow-system design tool — not a CRUD dashboard.
Target feel: **Figma for flow systems**, with input/output semantics baked into every node.

Core hierarchy visible in the UI:
```
Project → Workflow → Node (Process) → I/O Ports
                  ↘ Connection (Edge)
```

---

## Stack

| Role | Library |
|---|---|
| Framework | React + TypeScript + Vite |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Editor state | Zustand |
| Forms | React Hook Form + Zod |
| Graph | React Flow |

---

## Architecture Principles (NON-NEGOTIABLE)

1. **RESTful React client** — no GraphQL, no BFF, no RPC naming
2. **DTOs never reach components** — always convert via `toWorkflowCanvasViewModel`
3. **Three state layers**: TanStack Query (server) | Zustand (editor) | RHF (forms)
4. **Mutation hooks own**: payload building + invalidation + error normalization
5. **No single canvas blob** — backend domain endpoints consumed directly

---

## Route Structure

```
/projects
/projects/:projectId
/projects/:projectId/workflows/:workflowId   ← workspace screen
/projects/:projectId/inventory
/projects/:projectId/runs
/projects/:projectId/runs/:runId
/projects/:projectId/templates
/projects/:projectId/rules
```

---

## Module Structure

```
src/
  app/
    router/
    providers/
    layout/
  shared/
    api/          httpClient.ts · unwrapApiResponse.ts
    lib/          normalizeUiError.ts
    types/        api.ts
    ui/
    forms/
  entities/
    workflow/
      model/      types.ts · toWorkflowCanvasViewModel.ts
      api/        useWorkflowCanvasQuery.ts
    project/
    process/
    inventory/
    run/
    template/
    rule/
  features/
    workflow-create/
    process-edit/
    connection-edit/
    inventory-adjust/
    run-start/
    rule-edit/
    template-apply/
  pages/
    workspace/
      model/      workspaceStore.ts
      ui/         WorkspaceRoute.tsx · WorkflowCanvasPage.tsx
                  CanvasViewport.tsx · CanvasNode.tsx · CanvasEdge.tsx
                  NodeInspector.tsx · ConnectionInspector.tsx
```

---

## Screen Layout

```
+---------------------------------------------------------------+
| Top Bar: project name · workflow name · zoom · save status    |
+---------------+-----------------------------+-----------------+
| Left Panel    | Center Canvas               | Right Panel     |
| Template      | React Flow Graph            | Inspector       |
| Palette       | (visually dominant)         | (context-aware) |
+---------------+-----------------------------+-----------------+
```

### Top Bar (MVP)
- Project name, workflow name, workflow switcher
- Zoom controls, fit-to-screen
- Save status indicator
- Quick actions: create node · apply template · open rules · refresh · inline rename · color editor

### Left Panel — Template Palette
- Process Templates, Recently Used, Quick Node Types
- Each item: icon + name + category + node type + default color
- Click to apply (drag-and-drop deferred)

### Right Panel — Inspector (context-aware)

| Selection state | Show |
|---|---|
| Nothing | Workflow summary · node count · connection count · shortcuts |
| Node | Tabs: General / I/O / Rules |
| Connection | Label · type · from/to process · from/to I/O · flow rate · delay · loss · priority |
| Multi-select | Bulk action stubs |

**Node General tab fields**: name, color, processType, nodeType, status, position, size, description

**Node I/O tab**: input list + output list + add/edit/delete I/O
Each row: name · direction · type · quantity · unit · formula · color chip · required flag · shortage policy

Default port colors: input rows → `sky`, output rows → `emerald`

---

## Canvas Node Visual Model

```
+-----------------------------------+
| Header: name · color chip · type  |
+-----------------------------------+
| Inputs                            |
|  ●─ input A    (port row)         |
|  ●─ input B                       |
+-----------------------------------+
| Outputs                           |
|      output A ─●                  |
+-----------------------------------+
```

Required MVP canvas interactions:
pan · zoom · click select · marquee select · move node · connect node ·
double-click rename · keyboard delete · Escape to clear · recolor · edit I/O

Canvas feel: subtle grid, strong selection rings, clear hover states, minimal modal interruption.

---

## API Contract

### Base

```
Base path: /api
```

### Response Envelope

```json
{ "success": true,  "data": {},   "message": null }
{ "success": false, "data": null, "message": "Bad request" }
```

**Important**: no structured `code` field in error body. Use HTTP status as primary branch key, `message` as fallback text.

### Core Workspace Endpoints

```
GET    /api/workflows/{workflowId}
GET    /api/workflows/{workflowId}/canvas        ← primary canvas load
POST   /api/processes
PUT    /api/processes/{processId}
DELETE /api/processes/{processId}
POST   /api/process-ios
PUT    /api/process-ios/{processIoId}
DELETE /api/process-ios/{processIoId}
POST   /api/process-connections
PUT    /api/process-connections/{connectionId}
DELETE /api/process-connections/{connectionId}
GET    /api/flow-rules?projectId=...&targetType=...&targetId=...
POST   /api/flow-rules
PUT    /api/flow-rules/{ruleId}
DELETE /api/flow-rules/{ruleId}
GET    /api/process-templates
POST   /api/process-templates/{templateId}/apply
```

### Canvas Response Shape (`GET /api/workflows/{id}/canvas`)

```json
{
  "success": true,
  "data": {
    "workflow":    { "workflowId", "projectId", "workflowName", "workflowDesc", "workflowType", "workflowStatus" },
    "processes":   [{ "processId", "processName", "processType", "nodeType", "processStatus", "colorScheme", "posX", "posY", "width", "height", "processDesc", ... }],
    "processIos":  [{ "processIoId", "processId", "itemId", "ioName", "direction", "ioType", "quantity", "unit", "formula", "colorScheme", "requiredYn", "allowShortageYn" }],
    "connections": [{ "connectionId", "fromProcessId", "toProcessId", "fromIoId", "toIoId", "sourceHandle", "targetHandle", "connectionType", "connectionLabel", "flowRate", "unit", "delayTimeSec", "lossRate", "priority" }]
  }
}
```

---

## Canvas Data Identity Rules

| Concept | Backend field | Frontend use |
|---|---|---|
| Node id | `processId` | React Flow node `id` |
| Edge id | `connectionId` | React Flow edge `id` |
| Source handle | `sourceHandle` | Preserved as-is |
| Target handle | `targetHandle` | Preserved as-is |
| Port handle id | `processIoId` | React Flow handle `id` |
| Node color | `colorScheme` | CSS color mapping |
| Port color | `processIo.colorScheme` | Port row color |

Default handles (when no I/O row bound): `out-default` / `in-default`

---

## DTO → View Model Mapping

### Conversion function (pure)

```ts
toWorkflowCanvasViewModel(dto: WorkflowCanvasDto): WorkflowCanvasViewModel
```

**Steps**:
1. Index all `processIos` by `processId`
2. Group into `inputs` (direction=input) / `outputs` (direction=output)
3. Build `CanvasNodeViewModel[]`
4. Build `CanvasEdgeViewModel[]`
5. Derive `nodeMap` and `portMap` for O(1) lookup

### CanvasNodeViewModel

```ts
{
  id: processId,
  processId, projectId, workflowId,
  name: processName,
  processType, nodeType,
  status: processStatus,
  colorScheme,
  position: { x: posX, y: posY },
  size: { width, height },
  description: processDesc,
  inputs: CanvasPortViewModel[],
  outputs: CanvasPortViewModel[],
  inputCount, outputCount
}
```

### CanvasPortViewModel

```ts
{
  id: processIoId,
  processIoId, processId, itemId,
  name: ioName,
  direction, ioType,
  quantity: String(quantity),   // normalized to string
  unit, formula,
  colorScheme,
  required: requiredYn === 'Y',
  allowShortage: allowShortageYn === 'Y',
  handleId: processIoId
}
```

### CanvasEdgeViewModel

```ts
{
  id: connectionId,
  connectionId,
  source: fromProcessId,
  target: toProcessId,
  sourceHandle,              // preserved
  targetHandle,              // preserved
  fromProcessId, toProcessId, fromIoId, toIoId, itemId,
  connectionType,
  label: connectionLabel,
  flowRate: flowRate !== null ? String(flowRate) : null,
  unit, delayTimeSec, lossRate,
  priority
}
```

### WorkflowCanvasViewModel

```ts
{
  workflow: WorkflowHeaderViewModel,
  nodes: CanvasNodeViewModel[],
  edges: CanvasEdgeViewModel[],
  nodeMap: Record<string, CanvasNodeViewModel>,
  portMap: Record<string, CanvasPortViewModel>
}
```

---

## Query Keys

```ts
['projects']
['project', projectId]
['workflows', projectId]
['workflow', workflowId]
['workflow-canvas', workflowId]          // primary canvas key
['flow-rules', projectId, targetType, targetId]
['process-templates']
```

---

## Query Invalidation Policy

| Mutation | Invalidate |
|---|---|
| create / update / delete process | `['workflow-canvas', workflowId]` |
| create / update / delete process-io | `['workflow-canvas', workflowId]` |
| create / update / delete connection | `['workflow-canvas', workflowId]` |
| create process also | `['workflow', workflowId]` |
| create / update / delete rule | `['flow-rules', projectId, targetType, targetId]` |

Guideline: invalidate canvas root query. Avoid partial client-side graph patching until stable.

---

## Optimistic Update Policy

| Operation | Optimistic | Reason |
|---|---|---|
| node move | ✅ yes | rollback simple |
| node rename | ✅ yes | rollback simple |
| node color change | ✅ yes | rollback simple |
| connection label change | ✅ yes | rollback simple |
| create node | ❌ no | server id required |
| create I/O row | ❌ no | server id required |
| create connection | ❌ no | handle validation required |
| create rule | ❌ no | validation likely to fail |
| delete node | ❌ no | graph side effects too broad |

---

## Error Handling

### UiError shape

```ts
type UiError = {
  httpStatus: number
  message: string
  kind: 'validation' | 'not_found' | 'forbidden' | 'unknown'
}
```

HTTP → kind mapping: `400→validation` · `404→not_found` · `403→forbidden` · else `unknown`

### Error matrix

| Case | HTTP | Frontend action |
|---|---|---|
| rule validation failure | 400 | Keep drawer open, show inline error |
| invalid form body | 400 | Map to form-level error, keep form values |
| missing resource | 404 | Toast + refetch parent + clear stale selection |
| server error | 500 | Generic toast + allow retry |

---

## Zustand workspaceStore Shape

```ts
{
  selectedProcessId: string | null
  selectedConnectionId: string | null
  selectedPortId: string | null
  inspectorMode: 'none' | 'node' | 'connection' | 'multi'
  canvasMode: 'select' | 'connect'
  pendingConnectionDraft: ConnectionDraftState | null
  isRuleDrawerOpen: boolean
  isTemplateDrawerOpen: boolean
  activeColorPickerNodeId: string | null
  inlineEditingNodeId: string | null
  viewport: { x: number; y: number; zoom: number }
  panelWidths: { left: number; right: number }

  // actions
  selectNode(id: string): void
  selectEdge(id: string): void
  selectPort(id: string): void
  clearSelection(): void
  setCanvasMode(mode: CanvasMode): void
  setConnectionDraft(draft: ConnectionDraftState | null): void
  openRuleDrawer(): void
  closeRuleDrawer(): void
  startInlineEdit(nodeId: string): void
  stopInlineEdit(): void
}
```

**Rule**: server data stays in TanStack Query. workspaceStore holds only editor interaction state.

---

## Component Props Contracts

### WorkflowCanvasPage
```ts
{ canvas: WorkflowCanvasViewModel }
// reads selection from workspaceStore internally
```

### CanvasViewport
```ts
{
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  canvasMode: CanvasMode
  onNodeSelect(id: string): void
  onEdgeSelect(id: string): void
  onNodeDragEnd(processId: string, x: number, y: number): void
  onConnectStart(payload: ConnectStartPayload): void
  onConnectComplete(payload: ConnectCompletePayload): void
  onCanvasClick(): void
}
```

### CanvasNode (React Flow custom node)
```ts
{
  node: CanvasNodeViewModel
  selected: boolean
  editing: boolean
  onSelect(): void
  onRenameStart(): void
  onColorEdit(): void
  onPortSelect(processIoId: string): void
}
// Do NOT call REST APIs directly inside node component
```

### CanvasEdge (React Flow custom edge)
```ts
{ edge: CanvasEdgeViewModel; selected: boolean; onSelect(): void }
```

### NodeInspector
```ts
{
  node: CanvasNodeViewModel | null
  selectedPort: CanvasPortViewModel | null
  rules: FlowRuleViewModel[]
  onNodeSubmit(input: UpdateProcessInput): Promise<void>
  onPortCreate(input: CreateProcessIoInput): Promise<void>
  onPortUpdate(input: UpdateProcessIoInput): Promise<void>
  onPortDelete(processIoId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

### ConnectionInspector
```ts
{
  edge: CanvasEdgeViewModel | null
  rules: FlowRuleViewModel[]
  onSubmit(input: UpdateProcessConnectionInput): Promise<void>
  onDelete(connectionId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}
```

---

## Mutation Hook Naming Rules

✅ Good: `useCreateProcess` · `useUpdateProcess` · `useDeleteProcessIo` · `useCreateProcessConnection`

❌ Bad: `saveCanvasEverything` · `syncWorkspaceState` · `submitProcessGraphBlob`

Each mutation hook owns: request payload building · optimistic update · rollback · invalidation scope · error mapping.
Each mutation hook does NOT own: global selection logic · component open/close state · form formatting unrelated to API.

---

## Sprint 1 Scope (Read Path)

**IN**: app shell · REST client · API unwrap · canvas query · DTO→VM mapping ·
workspace route · CanvasViewport · node rendering · edge rendering · selection store · inspector read state

**OUT**: node create/edit forms · I/O edit · connection create · rule drawer content ·
template palette content · design polish

### File Creation Order

```
1.  src/shared/types/api.ts
2.  src/shared/api/httpClient.ts
3.  src/shared/api/unwrapApiResponse.ts
4.  src/shared/lib/normalizeUiError.ts
5.  src/entities/workflow/model/types.ts
6.  src/entities/workflow/model/toWorkflowCanvasViewModel.ts
7.  src/entities/workflow/api/useWorkflowCanvasQuery.ts
8.  src/pages/workspace/model/workspaceStore.ts
9.  src/app/providers/QueryProvider.tsx
10. src/app/router/index.tsx
11. src/main.tsx
12. src/pages/workspace/ui/WorkspaceRoute.tsx
13. src/pages/workspace/ui/WorkflowCanvasPage.tsx
14. src/pages/workspace/ui/CanvasViewport.tsx
15. src/pages/workspace/ui/CanvasNode.tsx
16. src/pages/workspace/ui/CanvasEdge.tsx
17. src/pages/workspace/ui/NodeInspector.tsx
18. src/pages/workspace/ui/ConnectionInspector.tsx
```

### Sprint 1 Verification Checklist

- [ ] `unwrapApiResponse` handles `success=true`
- [ ] `unwrapApiResponse` handles `success=false` → throws UiError
- [ ] canvas query returns grouped inputs/outputs per node
- [ ] node `colorScheme` renders correctly
- [ ] port `colorScheme` renders correctly
- [ ] edge `sourceHandle` / `targetHandle` preserved from backend
- [ ] selection state survives rerender
- [ ] node click → NodeInspector shows data
- [ ] edge click → ConnectionInspector shows data
- [ ] canvas background click → clears selection

---

## DO NOT

- Use raw DTOs (`ProcessResponse`, `ProcessIoResponse`) in components
- Mix Zustand selection with React Flow internal `selected` state
- Create fake handle ids or fake node ids
- Introduce GraphQL, BFF, or RPC-style naming
- Submit one giant canvas blob
- Directly mutate React Flow state without query reconciliation
