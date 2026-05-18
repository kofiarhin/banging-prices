# Codebase Bug Audit And Fix Spec

## 1. Metadata
- Spec filename: `_spec/2026-05-18-audit-codebase-bugs.md`
- Date: 2026-05-18
- Request ID / slug: `audit-codebase-bugs`
- Request source: latest user prompt synced to `WORK_REQUEST.md`
- Execution mode: `complete-workflow`
- Request classification: `bugfix`
- Scope level: `large`
- Risk level: `medium`

## 2. Original Request
- Raw user request: `audit codebase for potential bugs and fix them`
- Normalized request: Audit the whole repo, fix clearly demonstrable bugs that can be verified locally, and avoid UI changes unless required to fix a bug.
- Source prompt / WORK_REQUEST reference: `WORK_REQUEST.md`

## 3. Questions And Answers
- Questions asked:
  - Audit whole repo or prioritize a specific area?
  - Fix only clearly demonstrable locally verifiable bugs and document larger findings as follow-up?
  - Avoid UI changes unless required?
- Answers received:
  - Whole repo.
  - Yes, fix only clearly demonstrable locally verifiable bugs and document larger/riskier findings.
  - Yes, avoid UI changes unless required.
- Questions skipped: Not applicable.
- Remaining open questions: None blocking.

## 4. Problem Definition
- Problem being solved: The repo has known and newly detected defects that block lint, risk broken frontend API calls, and leave environment setup under-documented.
- Why it matters: These bugs reduce release confidence and can break production behavior when environment variables differ from local development.
- Current pain point: `client npm run lint` fails; frontend API URLs are duplicated with localhost fallbacks; one product-details hook uses a mis-cased env var; env examples are missing.
- Expected value: A cleaner baseline where available checks pass and frontend/backend configuration failures are easier to catch.

## 5. Current State Analysis
- Existing behavior: `client npm run build` passes. `client npm run lint` fails with four errors and five warnings. Server entry files parse. No server package-specific lint/test script exists.
- Existing architecture/components: React/Vite frontend with SCSS, TanStack Query, direct fetch calls, Express/Mongoose backend.
- Existing files/modules likely involved: lint-failing frontend components/hooks/pages, frontend API call sites, backend DB config, env example files, workflow artifacts.
- Existing data flow: Frontend reads `VITE_API_URL` directly in multiple files and calls Express REST endpoints. Backend reads `MONGO_URI` in DB connection.
- Existing API/UI/CLI/workflow behavior: API calls often fall back to `http://localhost:5000`; product details similar-products hook references `VITE_api_URL`, which is undefined under Vite casing.
- Existing tests or verification coverage: Client build and lint scripts only; no client test script; no server package test/lint script.

## 6. Desired End State
- Expected final behavior: Locally verifiable bug fixes are applied without broad refactors or visual redesign.
- User-facing outcome: Existing screens should behave the same, with fewer runtime/API failures.
- Developer-facing outcome: Client lint and build pass; API base URL behavior is centralized; required env examples exist.
- System/workflow outcome: Workflow artifacts document audit scope, fixes, verification, and follow-up risks.
- Backward compatibility expectations: Existing routes and API contracts remain unchanged.

## 7. Scope
- In scope:
  - Fix current client lint errors and warnings that indicate bugs or stale directives.
  - Fix frontend API URL defects by introducing a shared client and removing localhost hard-coded fallbacks from touched API call sites.
  - Fix the `VITE_api_URL` casing bug.
  - Add missing env examples and explicit backend `MONGO_URI` fail-fast validation.
  - Run available local verification after each task.
- Out of scope:
  - Full visual redesigns.
  - Reworking authentication flow or API contracts.
  - Database migrations.
  - New dependencies.
  - Deployment changes.
  - Scraper behavior changes unless required by verification.
- Non-goals: Converting the project to Tailwind, Redux, or a new folder structure.
- Explicit boundaries: Fix concrete bugs only; document broader architecture cleanup as follow-up.

## 8. Users And Use Cases
- Primary users: Developers maintaining and deploying the app.
- Secondary users: End users using product search, saved products, tracked alerts, and product details.
- Main use cases: Build, lint, browse product pages, fetch API data consistently, start backend with required env.
- Edge use cases: Missing env vars, unauthenticated alert pages, empty product carousel IDs, similar-products fetches.

## 9. Functional Requirements
- Required behaviors:
  - Remove lint errors caused by impure render keys, unused variables, stale disables, and effect dependency issues.
  - Preserve existing frontend query/mutation behavior while using a shared API helper.
  - Prevent product details similar-products fetch from using an undefined env var.
  - Backend startup must report missing `MONGO_URI` clearly before connecting.
- Inputs: Existing code and environment variables.
- Outputs: Passing verification where scripts exist; updated source and workflow artifacts.
- State changes: No database or persisted client-state changes.
- Error states: Missing frontend API URL should fail clearly in development/runtime; missing backend `MONGO_URI` should fail fast.
- Permissions/auth expectations: Clerk auth behavior remains unchanged.

## 10. Non-Functional Requirements
- Performance expectations: No added render loops; no impure render calls.
- Reliability expectations: Stable API URL composition and clear env failure modes.
- Security/privacy expectations: Do not expose secrets; do not add real env values to examples.
- Accessibility expectations: No UI changes beyond bug-preserving behavior.
- Maintainability expectations: Shared API helper reduces duplicated URL handling.
- DX expectations: Client lint/build pass; env examples document required keys.

## 11. Affected Surfaces
- Files likely affected:
  - `client/src/components/HeroCarousel/HeroCarousel.jsx`
  - `client/src/components/Header.jsx`
  - `client/src/components/SideNav/SideNav.jsx`
  - `client/src/hooks/usePostSignup.js`
  - `client/src/pages/Auth/PostRegisterPage.jsx`
  - `client/src/pages/PostLogin/PostLogin.jsx`
  - `client/src/pages/ProductsPage/ProductsPage.jsx`
  - `client/src/pages/tracked-alerts/TrackedAlertsPage.jsx`
  - `client/src/pages/ProductDetailsPage/useProductDetails.js`
  - `client/src/lib/api.js`
  - `server/config/db.js`
  - `.env.example`
  - `client/.env.example`
- Directories likely affected: `client/src`, `server/config`, workflow directories.
- UI surfaces: Product list, product details, tracked alerts, auth post-login/register, header/nav behavior only as needed to fix bugs.
- API routes: No route contract changes.
- Components: Header, SideNav, HeroCarousel.
- Services: New shared frontend API helper.
- Database/schema: None.
- Config/env vars: Document `MONGO_URI`, `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Tests: No test files expected unless necessary; scripts are limited.
- Docs: Workflow artifacts and possibly project context.
- Workflow artifacts: `WORK_REQUEST.md`, `_spec`, `_task`, `_progress`, `_handoff`, `_review`, `_release`, `_summary`.

## 12. Dependency And Integration Map
- Internal dependencies: Frontend hooks/pages depend on backend REST endpoints. Server DB config depends on `MONGO_URI`.
- External packages/services: React, TanStack Query, Clerk, Express, Mongoose. No new packages.
- Integration points: `VITE_API_URL`, Clerk token-bearing requests, `/api/*` routes.
- Ordering constraints: Fix lint first, then centralize API helper, then env/server fail-fast.
- Migration/setup requirements: Add example env files only; no data migration.

## 13. Data And State Impact
- Data models: None.
- Database changes: None.
- State management changes: Keep existing local/TanStack state.
- Cache/session/local storage impact: Query keys and cache behavior should remain stable.
- Backward compatibility impact: API paths and request payloads stay unchanged.

## 14. UX / API / Workflow Expectations
- UX expectations: No intended visual redesign. Text may change only to remove broken characters or preserve existing states if required by bug fix.
- API contract expectations: Existing request paths, headers, and methods remain unchanged.
- CLI/workflow behavior: Client lint/build should pass after fixes.
- Error handling expectations: Shared API helper should throw useful messages from JSON responses when possible.
- Empty/loading/success/failure states: Preserve existing UI states.

## 15. Execution Strategy
- Recommended implementation approach:
  - Fix lint blockers in the exact files reported by ESLint.
  - Add `client/src/lib/api.js` with URL composition and JSON helpers, then update call sites that currently hard-code `VITE_API_URL` or localhost fallbacks.
  - Add env examples and explicit backend missing-env check.
- Suggested sequencing:
  - `TASK-001`: Make client lint pass.
  - `TASK-002`: Centralize frontend API calls and fix env URL bugs.
  - `TASK-003`: Add env examples and backend DB fail-fast.
- Safe rollout/migration approach: Keep API contracts intact and verify with lint/build after each task.
- Files to inspect before editing: The lint-reported files, all direct API call sites, `server/config/db.js`, package scripts.
- Decisions to avoid until more evidence exists: Do not rewrite scraper stack, add tests infrastructure, or change deployment targets.

## 16. Verification Strategy
- Required automated checks:
  - `cd client && npm run lint`
  - `cd client && npm run build`
  - `node --check` for changed server JS files
- Required manual checks:
  - Static review of API helper call-site behavior and env examples.
- Test types needed: Existing scripts only; no test runner is currently configured.
- Build/lint/typecheck expectations: Lint and build should pass after client tasks.
- Acceptance evidence required: Command outputs and diff review documented in `_progress`.
- Proof of completion: All task criteria checked `[x]`, final diff audit, review/release/summary.

## 17. Acceptance Criteria
- [ ] `client npm run lint` passes with no errors.
- [ ] `client npm run build` passes after frontend bug fixes.
- [ ] Direct frontend API URL construction is centralized through `client/src/lib/api.js` for audited call sites.
- [ ] The product-details similar-products request no longer uses the wrong `VITE_api_URL` env key.
- [ ] Backend DB startup fails fast with a clear message when `MONGO_URI` is missing.
- [ ] `.env.example` and `client/.env.example` exist without secrets.
- [ ] No UI redesign, deployment change, database schema change, or new dependency is introduced.

## 18. Edge Cases And Failure Modes
- Edge cases: Product items with missing IDs, unauthenticated tracked-alert page, empty API base URL, API JSON/non-JSON errors, missing `MONGO_URI`.
- Failure modes: Lint may expose additional issues after first fixes; build may expose import path mistakes; server cannot be fully integration-tested without DB credentials.
- Regression risks: Incorrect shared helper could alter request headers or body handling; effect dependency fixes could change timing.
- Recovery expectations: If verification fails, classify in-scope vs unrelated, fix targeted causes, and rerun the same command.

## 19. Risks And Mitigations
- Technical risks: Centralizing fetch across many files can introduce path/body regressions. Mitigation: keep helper small and preserve method/header/body behavior.
- Product/UX risks: Avoid visual changes; verify build/lint only unless UI smoke becomes necessary.
- Security risks: Env examples must not include real secrets.
- Scope risks: Whole-repo audit is broad. Mitigation: only fix locally demonstrable bugs and document follow-up findings.
- Mitigation plan: Sequential tasks with verification after each.

## 20. Assumptions
- Explicit assumptions:
  - Existing `.env` values are local and must not be copied into examples.
  - `VITE_API_URL` is intended to be the only frontend API base variable.
  - No backend integration test can run without database credentials; syntax/static validation is acceptable for backend task.
- Confidence level: Medium-high.
- What to revisit if assumptions are wrong: API helper default behavior and env example contents.

## 21. Open Questions
- Blocking questions: None.
- Non-blocking questions: Whether to later migrate all API logic into domain service files and TanStack custom hooks under the new structure.
- Execution impact: Non-blocking cleanup should be documented, not completed in this workflow.

## 22. Task Extraction Notes
- Suggested vertical task boundaries: Lint baseline, API URL reliability, backend/env startup reliability.
- Suggested first task: Fix lint blockers and warnings because it proves an immediate known failure.
- Suggested task ordering: `TASK-001`, `TASK-002`, `TASK-003`.
- Areas that should not become separate tasks: Visual redesign, deployment changes, scraper refactors.
- How the 3-pass Build -> Refine -> Polish loop should apply: Each task gets a small initial fix, a verification-driven refinement, and a final cleanup/recheck.
