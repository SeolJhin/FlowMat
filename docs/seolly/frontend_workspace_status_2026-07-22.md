# Frontend Workspace Status as of July 22, 2026

This note maps the current FlowMat frontend workspace behavior to the ideas referenced under `docs/seolly`.

## Implemented Canvas and Workspace Behavior

- Route-level lazy loading is active.
- Workspace-heavy UI is split further with lazy loading for canvas and inspectors.
- Workspace entry prefetch is triggered from the home screen on hover/focus.
- `NodeToolbar` and `EdgeToolbar` are in use.
- Port highlighting during connection drag is implemented with `useConnection`.
- `MiniMap`, `snapToGrid`, `onlyRenderVisibleElements`, and `onBeforeDelete` are wired into the React Flow viewport.
- Delete actions now use a consistent React Flow delete pipeline.

## Implemented Collaboration Behavior

- STOMP auth uses the real JWT access token.
- A per-tab `clientId` is sent only for echo filtering.
- Presence includes cursor movement, editing state, heartbeat, and stale cleanup.
- Reconnect flow uses `sinceSeq` graph recovery before falling back to a full reload.
- New clients fetch a presence snapshot after connect or reconnect.

## Current Tradeoffs

- The workspace still uses a custom local `nodes/edges` state integration instead of directly adopting `useNodesState` and `useEdgesState`.
- This is acceptable for now because the local implementation already integrates remote patching, inline edit conflict deferral, and custom canvas behaviors.
- If future React Flow upgrades simplify this integration, the standard hooks can be reconsidered.

## Remaining Frontend Risks

- Conflict deferral currently protects the main inline edit flows, but future editable fields should follow the same rule before shipping.
- There is still no dedicated frontend test runner by project choice, so regression confidence depends on `build`, `lint`, and backend-side tests plus manual multi-client verification.
