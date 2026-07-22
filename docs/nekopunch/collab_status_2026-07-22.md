# Collaboration Status as of July 22, 2026

This note records the current FlowMat implementation state after aligning the codebase with the collaboration design notes in `docs/nekopunch` and the frontend interaction notes in `docs/seolly`.

## Implemented

- Incremental workflow graph sync now uses `graphSeq` plus `sinceSeq` recovery instead of invalidating and refetching the whole canvas on every remote change.
- Graph changes are stored in Redis with retention instead of permanent database rows.
- Presence now supports:
  - `JOIN`
  - `LEAVE`
  - `CURSOR_MOVED`
  - `NODE_EDITING`
  - `HEARTBEAT`
- Stale collaborator cleanup is active on the server.
- New clients can load a presence snapshot immediately instead of waiting for later events.
- WebSocket STOMP auth now uses the real JWT access token, and per-tab `clientId` is used only for echo filtering.
- Local canvas mutations patch the React Query cache instead of forcing full `workflow-canvas` refetches.
- Project and workflow membership checks are enforced for protected REST reads/writes and STOMP workflow destinations.
- Role policy is now split as:
  - `viewer`: read only
  - `editor`: read and workflow/project-scoped writes
  - `owner`: read, write, and owner-only project operations
- Project invite and member administration APIs are now implemented for:
  - invite create
  - invite accept
  - invite cancel
  - member list
  - member role update
  - member removal
- Existing projects are backfilled with owner memberships through database migration.
- Global template policy is now split as:
  - public templates: visible to authenticated users
  - private templates: visible and manageable only to admins
  - template create/update/delete: admin only

## Operational Controls

Backend collaboration settings are now externalized:

- `APP_WORKFLOW_COLLAB_GRAPH_RETENTION`
- `APP_WORKFLOW_COLLAB_GRAPH_KEY_TTL`
- `APP_WORKFLOW_COLLAB_PRESENCE_HEARTBEAT_TIMEOUT`
- `APP_WORKFLOW_COLLAB_PRESENCE_CLEANUP_INTERVAL`

Frontend collaboration timing is now externalized:

- `VITE_WORKFLOW_SYNC_HEARTBEAT_MS`
- `VITE_WORKFLOW_SYNC_RECONNECT_DELAY_MS`

Default values remain conservative:

- graph retention: 31 days
- Redis key TTL: 35 days
- presence timeout: 45 seconds
- cleanup interval: 15 seconds
- browser heartbeat interval: 15 seconds
- browser reconnect delay: 3 seconds

## Cost and Retention Direction

- Graph change history is no longer intended as a permanent relational audit log.
- Redis keeps recent collaboration history long enough for reconnect and short-term recovery.
- If a client falls outside the retained window, the backend returns `resetRequired=true` and the frontend performs a full canvas reload.

This keeps operational storage bounded while preserving practical reconnect behavior.

## Observability Added

- The backend now logs when incremental graph recovery can no longer be satisfied and a reset is required.
- The backend now logs how many stale presence sessions were removed on each cleanup pass when removals occur.

## Remaining Gap

Identity authentication, membership authorization, and the first-pass role matrix are now enforced.

The remaining security gap is not the basic read/write split anymore. It is policy coverage and administration:

- project member and invite APIs still do not have dedicated frontend management screens
- invite delivery is not wired to email yet; the API returns tokens and status, but mail transport is still absent
- admin capability still relies on the existing `users.user_role` field, not a richer central policy engine

If production deployment needs stronger governance, the next step is explicit role-management and admin policy, not collaboration transport security.
