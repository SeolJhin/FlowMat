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

## Notification Infrastructure

### Email (`MailService`)

- `@Async` + `JavaMailSender` + `MimeMessageHelper` (HTML)
- Gmail SMTP via `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` env vars
- If `MAIL_USERNAME` is blank, send is skipped silently (no startup failure)
- `app.frontend-url` env var controls the accept link in the email body
- Called from `ProjectInviteServiceImpl.createInvite()` after invite is persisted

### Slack (`SlackNotificationService`)

- Pure `java.net.http.HttpClient` POST to Incoming Webhook URL
- Configured via `SLACK_WEBHOOK_URL` env var; silent no-op when unset
- Called from `ProjectInviteServiceImpl.createInvite()` alongside email
- Both notifications are `@Async` — invite API response is not blocked

### Frontend invite acceptance (`/invite/accept?token=...`)

- New route handled by `InviteAcceptRoute`
- Guards: token missing → error state; user not logged in → redirect prompt
- On accept: `POST /project-invites/accept` with `{ inviteToken }`
- Success → join confirmation + link to home

### Frontend member/invite management (`/projects/:projectId/settings`)

- New route handled by `ProjectSettingsRoute`
- **MembersPanel**: list active members, inline role selector (viewer/editor), Save + Remove per row
- **InvitesPanel**: send invite form (email + role), list pending invites with Cancel action
- Accessible from Home via "Settings" link in the selected-project tools bar
- API hooks: `useProjectMembersQuery`, `useProjectInvitesQuery`, `useCreateInviteMutation`, `useCancelInviteMutation`, `useUpdateMemberRoleMutation`, `useRemoveMemberMutation`, `useAcceptInviteMutation`

## RBAC (Role-Based Access Control)

The V1 schema already contained `roles`, `role_permissions`, and `user_roles` tables.
These are now wired into a full permission service layer.

### DB — V7 migration

- Seeds built-in system roles: `admin`, `user`
- Seeds admin permissions: `template:read_private`, `template:manage`, `user:manage`, `project:view_all`
- Backfills existing admin users from `users.user_role = 'admin'` into `user_roles` (idempotent)

### SystemPermission enum

| Code | Used by |
|------|---------|
| `template:read_private` | list/get private templates |
| `template:manage` | create/update/delete templates |
| `user:manage` | `AdminAccessService.requireAdmin()` |
| `project:view_all` | reserved for future admin panel |

### PermissionService

Resolves the current user's system roles from `user_roles` (scope_type='global'), then checks
`role_permissions.permission_code`. Both `require(permission)` (throws on deny) and
`hasPermission(permission)` (returns boolean) are provided.

### Updated callers

- `ProcessTemplateServiceImpl` — replaced `adminAccessService.requireAdmin()` with `permissionService.require(TEMPLATE_MANAGE)` and `isAdmin()` with `permissionService.hasPermission(TEMPLATE_READ_PRIVATE)`
- `WorkflowTemplateServiceImpl` — same pattern
- `AdminAccessService` — now delegates to `permissionService.require(USER_MANAGE)`

### Tests

- `AdminAccessServiceTest` — updated to verify delegation to `PermissionService`
- `ProcessTemplateServiceImplTest` — updated to mock `PermissionService` directly
- `WorkflowTemplateServiceImplTest` — **new**, covers public/private visibility and create permission

All tests pass under `.\gradlew.bat test`.

## Role Management API

### Endpoints (`/admin/users/**`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users/roles` | List all available system roles |
| `GET` | `/admin/users/{userId}/roles` | List roles assigned to a user |
| `POST` | `/admin/users/{userId}/roles` | Grant a role (`{ roleName }`) |
| `DELETE` | `/admin/users/{userId}/roles/{userRolesId}` | Revoke a role assignment |

All endpoints require `USER_MANAGE` permission (checked inside `UserRoleServiceImpl`).

### Endpoints (`/admin/projects`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/projects` | List all projects (admin view) |

This reuses `ProjectService.listProjects()`, which now returns all non-deleted projects when the caller holds `PROJECT_VIEW_ALL`.

### `project:view_all` wired

`ProjectAccessService.listAccessibleProjects()` checks `permissionService.hasPermission(PROJECT_VIEW_ALL)` before applying the membership filter. Admins get the full project list via the same `GET /projects` endpoint — no separate admin path needed.

### New entities / repositories

- `Role` entity → `roles` table
- `RoleRepository` with `findByRoleName()`
- `UserRoleServiceImpl` — implements `listRoles`, `listUserRoles`, `grantRole`, `revokeRole`

## Frontend — Admin Role Management (`/admin`)

### Route

`/admin` → `AdminRoute` — accessible from the Home header via **Admin** button.

### Panels

**System Roles** (read-only)
- Lists all available system roles with description
- Fetched from `GET /admin/users/roles` via `useRolesQuery`

**User Role Management**
- Free-text userId input + "Look up" button
- On lookup: shows current roles for that user with **Revoke** per row
- Shows grantable roles (those not yet assigned) with **+ roleName** grant buttons
- All mutations use `useGrantRoleMutation` / `useRevokeRoleMutation` which invalidate `['admin-user-roles', userId]`
- 403 from server surfaces as an inline error message — non-admin users who navigate to `/admin` see the error rather than a blank screen

### API hooks

| Hook | Endpoint |
|------|----------|
| `useRolesQuery` | `GET /admin/users/roles` |
| `useUserRolesQuery(userId)` | `GET /admin/users/{userId}/roles` |
| `useGrantRoleMutation(userId)` | `POST /admin/users/{userId}/roles` |
| `useRevokeRoleMutation(userId)` | `DELETE /admin/users/{userId}/roles/{userRolesId}` |

## Admin User Search + Entity Consolidation

### Duplicate entity fix

`global/rbac/entity/{Role,UserRole,RolePermission}` and `global/rbac/repository/*` were deleted.
The canonical entities live in `domain/user/domain/entity/` and `domain/user/repository/`.
`PermissionService` and `UserRoleServiceImpl` were updated to import from those paths.
The `global/rbac/` package now contains only `SystemPermission.java` and `PermissionService.java`.

### User search

`GET /admin/users?q=` searches `users` by userId / userName / userEmail (case-insensitive LIKE).
Requires `USER_MANAGE` permission. Implemented in `UserServiceImpl.searchUsers()`.

### Frontend admin UX

`AdminRoute` now has two sections:
- **System Roles** — read-only table of available roles
- **User Role Management** — search box → results table → click a row to expand inline role editor (grant/revoke badges per user, no page navigation needed)

New hook: `useAdminUsersQuery(query)` → `GET /admin/users?q=`

## Remaining Gaps

| Area               | Status                                                                     |
|--------------------|----------------------------------------------------------------------------|
| Invite email in CI | SMTP credentials must be provided via env vars for email to actually send. |
