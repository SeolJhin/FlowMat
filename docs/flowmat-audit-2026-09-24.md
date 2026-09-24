# FlowMat code audit — 2026-09-24

## Scope and baseline

- Canonical applications: `flowmat_backend` and `flowmat_frontend`; root Gradle files and `legacy` are outside the canonical build (`README.md`).
- Reviewed repository structure, application scripts, CI workflows, current code, existing implementation backlog, and test results. The 2026-08 backlog is historical: Rules, Runs, Work Orders, LOTs, units, and BOM services have since gained implementations. It should not be used as a current task list without checking code.
- Frontend baseline before concurrent edits: lint, TypeScript, 168 Vitest tests, and Vite build passed. After the other Inventory panels arrived, lint, TypeScript, 172 Vitest tests, and Vite build passed again.
- Backend baseline: 199 tests ran, 190 passed, and 9 Testcontainers integration tests failed during Docker initialization. These failures do not establish application defects; database integration behavior remains unverified in this environment.

## Confirmed gaps and actions

| Area | Evidence | Action / status |
| --- | --- | --- |
| Equipment catalog | `EquipmentService`, `EquipmentServiceImpl`, and `EquipmentController` had no methods; the schema and entity already existed. | Implemented project-scoped list, get, create, update, and soft delete; added Inventory equipment panel and unit tests. |
| Equipment access control | A project ID is supplied by callers and equipment IDs can be guessed. | Read/write/owner checks are performed on the persisted equipment's project before returning or changing it. |
| Equipment input | Database columns have finite lengths and status is free text in the original entity. | Added request validation and a status allowlist. |
| Home session restoration | The protected route refreshes a cookie-backed session, but `HomeRoute` only checked the in-memory access token on initial render. Reloading `/` returned a signed-in user to the login screen. | Refresh on home mount when the session hint exists; the login reload browser test now passes. |
| Ribbon browser test | The UI exposes `Annotate` and `View` as tabs, while the test still looked for buttons and matched two `Fit View` buttons. | Updated the test to target the tabs and ribbon button; all six mocked browser E2E tests pass with two workers. |
| Historical placeholders | `ProductionExecutionService`, `WorkflowLockService`, and `LoginHistoryService` remain empty interfaces. | Product behavior and clients must be specified before implementing; their existence alone does not justify an API. |
| Integration coverage | Nine backend tests require Docker and did not start. | Run backend test suite with a working Docker engine before release. |
| Concurrent frontend work | During this audit, InventoryRoute gained references to `LotPanel` and `BomPanel` before those files existed. | Preserved the other work and repeated verification after the files arrived; checks passed. |

## Verification limits

- Equipment service unit tests pass without Docker. A live PostgreSQL/API/browser test was not possible here.
- Frontend lint, TypeScript, 172 unit tests, production build, and six mocked browser E2E tests pass after the fixes.
- This is a source and test audit of the canonical applications, not a claim that every runtime workflow or schema table has been exercised.
- The worktree has unrelated concurrent edits. Review the final diff by owner before committing; this audit makes no commit or push.
