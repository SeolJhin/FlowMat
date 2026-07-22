# Collaboration Status as of July 23, 2026

This document records the current FlowMat backend implementation state.
It supersedes `collab_status_2026-07-22.md`.

---

## Implemented

### WebSocket Collaboration Infrastructure

- Incremental workflow graph sync uses `graphSeq` plus `sinceSeq` recovery instead of
  invalidating and refetching the whole canvas on every remote change.
- Graph changes are stored in Redis with bounded retention instead of permanent database rows.
- If a client falls outside the retained window the backend returns `resetRequired=true`
  and the frontend performs a full canvas reload.
- Presence supports `JOIN`, `LEAVE`, `CURSOR_MOVED`, `NODE_EDITING`, and `HEARTBEAT`.
- Stale collaborator cleanup runs on a configurable server-side interval.
- New clients can load a presence snapshot immediately instead of waiting for later events.
- WebSocket STOMP auth uses the real JWT access token; per-tab `clientId` is used only
  for echo filtering.

### Local Cache Behavior

- Local canvas mutations patch the React Query cache instead of forcing full
  `workflow-canvas` refetches.

### Role and Access Policy

Role policy is enforced uniformly through `ProjectAccessService`:

| Role   | Permissions                                                   |
|--------|---------------------------------------------------------------|
| viewer | read only                                                     |
| editor | read + workflow and project-scoped writes                     |
| owner  | read + write + owner-only project operations                  |

All REST and STOMP paths for project, workflow, node, port, connection, item, rule,
and collaboration destinations route through this service.

### Membership Management

**Project invite API** (`ProjectInviteController`, base path `/project-invites`):

- `GET /project-invites?projectId={id}` — list pending invites
- `POST /project-invites` — create invite (projectId in body)
- `POST /project-invites/accept` — accept invite (token in body)
- `DELETE /project-invites/{inviteId}` — cancel invite

**Project member API** (`ProjectMemberController`, base path `/project-members`):

- `GET /project-members?projectId={id}` — list active members
- `PUT /project-members/{projectMemberId}/role` — change role
- `DELETE /project-members/{projectMemberId}` — remove member

**Invite service rules** (`ProjectInviteServiceImpl`):

- Duplicate pending invite for the same project and email is rejected.
- Self-invite is rejected.
- Inviting an already-active member is rejected.
- Acceptance is token-based; on accept a `project_member` row is created automatically.

**Member service rules** (`ProjectMemberServiceImpl`):

- Only the owner can change roles or remove members.
- The owner role itself cannot be changed via this API.
- The owner cannot be removed.
- Removal sets `member_status = removed` (soft delete, no hard delete).

### Template Seed Data

`TemplateSeedInitializer` runs at startup via `ApplicationRunner` and idempotently seeds sample
templates if they do not already exist:

- **Workflow templates** (4 total): Manufacturing Main Flow, Software Data Pipeline, Restaurant Service Flow, Logistics Fulfillment Flow.
- **Process templates** (16 total): Mixing, Heating, Packaging (manufacturing); Parser, Validator, Transformer, Storage (software pipeline); Prep, Cooking, Plating, Serving (restaurant); Receiving, Storage Rack, Picking, Packing, Shipping (logistics).

All seeded templates have `public_yn = 'Y'`. Seed failures are logged as warnings and do not abort startup.

### Global Template Admin Policy

Admin identity is resolved by `AdminAccessService` (currently based on `users.user_role = admin`).

| Operation               | Who can perform it                  |
|-------------------------|-------------------------------------|
| List public templates   | any authenticated user              |
| List private templates  | admin only                          |
| Apply private template  | admin only                          |
| Create template         | admin only                          |
| Update template         | admin only                          |
| Delete template         | admin only                          |

Applies to both process templates (`ProcessTemplateServiceImpl`) and workflow templates
(`WorkflowTemplateServiceImpl`).

---

## Database

**V6__project_membership_admin.sql** adds:

- Owner membership backfill for existing projects.
- Unique constraint on active member (project + user).
- Unique constraint on invite token.
- Unique constraint on pending invite per project/email.
- Index on member status and invite status for query performance.

**Entity additions:**

- `ProjectInvite.acceptedAt`
- `ProjectMember.joinedAt`
- `ProjectMember.lastAccessedAt`
- `User.userRole` mapped to `users.user_role`

**Repository additions:**

- `ProcessTemplateRepository.findAllByIsPublicTrue()`
- `WorkflowTemplateRepository.findAllByIsPublicTrue()`

---

## Operational Controls

Backend collaboration settings are externalized:

| Variable                                         | Default    |
|--------------------------------------------------|------------|
| `APP_WORKFLOW_COLLAB_GRAPH_RETENTION`            | 31 days    |
| `APP_WORKFLOW_COLLAB_GRAPH_KEY_TTL`              | 35 days    |
| `APP_WORKFLOW_COLLAB_PRESENCE_HEARTBEAT_TIMEOUT` | 45 seconds |
| `APP_WORKFLOW_COLLAB_PRESENCE_CLEANUP_INTERVAL`  | 15 seconds |

Frontend collaboration timing is externalized:

| Variable                                | Default   |
|-----------------------------------------|-----------|
| `VITE_WORKFLOW_SYNC_HEARTBEAT_MS`       | 15 000 ms |
| `VITE_WORKFLOW_SYNC_RECONNECT_DELAY_MS` | 3 000 ms  |

---

## Observability

- Backend logs when incremental graph recovery cannot be satisfied and a reset is required.
- Backend logs how many stale presence sessions were removed on each cleanup pass.

---

## Tests Added

| Test file                         | Coverage                                          |
|-----------------------------------|---------------------------------------------------|
| `ProjectInviteServiceTest`        | invite create and accept flows                    |
| `ProjectMemberServiceTest`        | role change and member removal                    |
| `AdminAccessServiceTest`          | admin identity resolution                         |
| `ProcessTemplateServiceImplTest`  | public/private template visibility policy         |
| `ProjectAccessServiceTest`        | role-based read/write/owner checks                |
| `StompAuthChannelInterceptorTest` | STOMP destination auth                            |
| `WorkflowPresenceCleanupServiceTest` | stale presence session cleanup               |
| `PresenceControllerTest`          | presence snapshot and event broadcast             |
| `JwtAuthFilterTest`               | JWT extraction and authentication filter          |
| `FlowRuleEngineServiceImplTest`   | rule engine evaluation                            |
| `FlowRuleExpressionEvaluatorTest` | expression evaluator for rule conditions          |

`WorkflowTemplateServiceImplTest` does not yet exist — workflow template policy coverage comes
only from the process template test file.

All tests pass under `.\gradlew.bat test`.
Frontend build passes under `npm run build` and `npm run lint`.

---

## Remaining Gaps

| Area                              | Status                                                                           |
|-----------------------------------|----------------------------------------------------------------------------------|
| Invite/member management UI       | API is complete; dedicated frontend screens have not been built yet.             |
| Email transport for invites       | API returns token and status; mail delivery is not wired up.                    |
| Admin policy engine               | Based on single `users.user_role` field; no central RBAC or policy engine yet. |
| WorkflowTemplateServiceImplTest   | No test file yet; workflow template policy relies on process template tests.    |

The next planned steps are:

1. Build project invite and member management UI.
2. Wire invite acceptance to email delivery.
3. Expand admin authorization from `user_role` to an explicit permission model.
