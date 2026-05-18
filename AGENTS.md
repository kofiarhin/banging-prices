# Agent Operating Guide

This file defines how AI coding agents should work in this repository. It is intended for OpenAI Codex, Claude Code, Cursor, and similar tools.

Customize placeholders before using this in a production project. MERN is the default example stack, but these rules apply to any stack.

## Project Context

- Project name: `<PROJECT_NAME>`
- Product summary: `<ONE_SENTENCE_PRODUCT_SUMMARY>`
- Primary stack: MERN by default unless changed
  - Frontend: React, Vite, Tailwind CSS
  - Backend: Node.js, Express, MongoDB, Mongoose
  - Testing: Vitest/React Testing Library for frontend, Jest/Supertest for backend
- Deployment: `<DEPLOYMENT_TARGETS>`
- Workflow entrypoints:
  - `WORK_REQUEST.md`
  - `RUN_WORKFLOW.md`
- Main workflow memory:
  - `_handoff/current.md`
  - `_spec/`
  - `_task/`
  - `_progress/progress.md`
  - `_review/`
  - `_summary/`
  - `_release/`
  - `_decisions/`
- Supporting docs:
  - `docs/PROJECT_CONTEXT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/VERIFY.md`
  - `docs/DECISIONS.md`
  - `docs/PROMPTS.md`

## Operating Rules

1. If the latest user prompt looks like project work, treat it as the active work request and route it through `RUN_WORKFLOW.md`.
2. Project work includes requests such as `implement`, `fix`, `create`, `generate`, `audit`, `refactor`, `test`, `document`, `deploy`, `review`, or similar software changes.
3. Automatically sync the active user prompt into `WORK_REQUEST.md`. Do not ask the user to manually edit workflow docs first.
4. Default execution mode is `complete-workflow`.
5. Execution modes:
   - `plan-only`: ask questions, write spec, write task plan, then stop.
   - `single-task`: execute only the next ready task through the full 3-pass hardening loop, update artifacts, then stop.
   - `complete-workflow`: execute all generated tasks sequentially until the request/spec is complete or a stop condition is reached; each executable task must complete the full 3-pass hardening loop before the next task starts.
6. Agents must not stop after `TASK-001` unless execution mode is explicitly `single-task` or a stop condition is reached.
7. Agents must continue through `TASK-002`, `TASK-003`, and later tasks automatically when the current task is `Done` and safe to continue.
8. Ask focused clarifying questions before implementation unless the prompt explicitly says `skip questions`.
9. Keep asking until there is about 90% understanding of the request.
10. Clarify the goal, users, exact behavior, edge cases, UI/API expectations, data model, constraints, success criteria, and out-of-scope items.
11. If the request is tiny and obvious, ask fewer questions, but still avoid touching code until the spec and task plan exist.
12. Do not touch code during the questioning phase.
13. If the user says `skip questions`, generate a best-effort spec and clearly record assumptions.
14. No implementation is allowed without a saved spec in `_spec/`.
15. No implementation is allowed without a saved task plan in `_task/`.
16. Before planning, read `_handoff/current.md` if it exists, `_progress/progress.md`, and the latest relevant file in `_summary/`.
17. Before touching code for any task, read `_handoff/current.md`, `_progress/progress.md`, and the latest relevant file in `_summary/`.
18. Read `RUN_WORKFLOW.md` before planning or editing.
19. Read `docs/PROJECT_CONTEXT.md` and relevant supporting docs before implementation, updating them only when durable project facts change.
20. Generate a timestamped or slugged spec file in `_spec/`, for example `_spec/2026-05-10-add-dark-theme.md`.
21. Generate a vertical task plan in `_task/` from the saved spec.
22. Tasks must be vertical slices of user-visible or independently verifiable value, not vague frontend/backend/database layers.
23. Break work into Ralph Wiggum-style tasks: small, literal, safe, sequential steps that are easy to follow and hard to misinterpret.
24. Implement tasks sequentially, one task at a time.
25. Keep changes scoped to the active task.
26. Never implement unrelated work.
27. Every task must move through `Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done`.
28. Every executable task must run through Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish before it can be marked `Done`.
29. Each iteration must include documented goal, changes made, verification command/result, review findings, acceptance status, remaining issues, and next action.
30. Allowed terminal task states are `Done`, `Blocked`, and `Needs Human Review`.
31. A task cannot be `Done` unless all three iterations are complete, verification was attempted in each iteration, the task was reviewed in each iteration, and final acceptance is complete.
32. A task cannot move to `Reviewed` unless verification was attempted.
33. If verification cannot run, the task can be `Needs Human Review`, not `Done`.
34. Never skip verification. If verification cannot run, document the reason and the best available manual check.
35. Record acceptance results for every task. A task cannot be `Done` unless every required acceptance criterion is checked `[x]`; `[ ]` or `[~]` means `Blocked` or `Needs Human Review`.
36. If verification fails during any iteration, follow the failure recovery protocol inside that iteration: identify the failing command, capture the error, classify the failure, fix only in-scope issues, rerun the exact failing command, and stop with `Needs Human Review` if targeted recovery does not prove the task.
37. After each task, append progress to `_progress/progress.md`, including separate iteration evidence, acceptance results, and any failure recovery notes.
38. After each task, update `_handoff/current.md` so it reflects the latest completed task, current task, current iteration, current phase, blockers, dirty worktree status, verification status, acceptance status, iteration evidence status, and next step.
39. Always keep `_handoff/current.md` current; do not leave handoff stale after task execution.
40. The handoff file should allow another agent/session to resume without rereading the entire conversation.
41. `continue workflow` must start from `_handoff/current.md`.
42. If `_handoff/current.md` conflicts with `_progress/progress.md`, trust `_progress/progress.md` for completed task history and update handoff accordingly.
43. Before final review and summary, run or document the final diff audit with `git diff --stat` and `git diff` when available.
44. After all executable tasks are complete or a stop condition is reached, create a review file in `_review/`.
45. After review, create release notes in `_release/<request-id>.md`.
46. After release notes are complete, create or append a summary in `_summary/` and update `_handoff/current.md`.
47. Record meaningful architecture or product decisions in `_decisions/`; do not create decision files for routine edits.
48. Before the final response, run the workflow health check.
49. Continue to the next task only when the current task completed Build -> Refine -> Polish, is verified, reviewed, documented, all required acceptance criteria are met, and safe to continue.
50. Stop if scope is unclear, risky, destructive, unverified, blocked, or requires unavailable access.
51. Final review, release notes, and summary must represent the full completed request or documented stop state, not only the first task.

## Required Workflow

For a work request:

1. Use the latest direct user prompt as the active request when it looks like project work; otherwise read `WORK_REQUEST.md`.
2. Sync the active request into `WORK_REQUEST.md`.
3. Read `RUN_WORKFLOW.md`.
4. Ask clarifying questions until there is about 90% understanding, unless the prompt explicitly says `skip questions`.
5. If questions are skipped, write assumptions into the spec.
6. Check repository status for dirty worktree protection:

   ```bash
   git status --short
   ```

   Document existing dirty files, files planned for this workflow, and overlap risk. If dirty files overlap with planned files, stop and ask before editing. If dirty files are unrelated, continue but document them. Never overwrite user changes and never clean/reset files unless explicitly instructed.
7. Read `_handoff/current.md` if it exists, `_progress/progress.md`, the latest relevant `_summary/` entry, and durable supporting docs.
8. Generate a detailed spec in `_spec/` using the required detailed spec template.
9. Generate a vertical task plan in `_task/` from the saved detailed spec.
10. If execution mode is `plan-only`, stop after saving the spec and task plan.
11. If execution mode is `single-task`, execute only the next ready task through the full 3-pass hardening loop, update artifacts, then stop.
12. If execution mode is omitted, use `complete-workflow`.
13. In `complete-workflow`, execute every task in order until all tasks are complete or a stop condition is reached; each executable task must complete Build -> Refine -> Polish before the next task starts.
14. For each task:
    - read latest `_progress/progress.md`
    - read relevant `_summary/`
    - inspect the codebase for the current task
    - implement only the current task through Iteration 1 Build
    - refine only in-scope issues through Iteration 2 Refine
    - polish and harden through Iteration 3 Polish
    - verify, critique, and record evidence inside each iteration
    - append progress to `_progress/progress.md`
    - update `_handoff/current.md`
    - continue to the next task automatically only when the current task is `Done` and safe
15. Before final review/summary, run the final diff audit:

    ```bash
    git diff --stat
    git diff
    ```

    Document whether the diff matches the saved spec, unrelated files were touched, workflow artifacts were updated correctly, tests were added or updated for changed behavior, scope creep occurred, generated junk or temporary files appeared, and sensitive values or secrets were accidentally added. If either command cannot run, document why.
16. After all allowed tasks are complete or the workflow stops, create a review file in `_review/`.
17. After the review, create release notes in `_release/<request-id>.md`.
18. After release notes, create or append a summary in `_summary/`.
19. Run the workflow health check and mark the result as `Passed`, `Partial`, or `Failed`.
20. Check repository status again:

    ```bash
    git status --short
    ```

19. Summarize results, include the final artifact checklist, and suggest a commit message.

## Continue Workflow Command

If the user says `continue workflow`:

1. Read `_handoff/current.md` first and use it as the primary resume source.
2. Read `_progress/progress.md` to verify completed task history.
3. If `_handoff/current.md` conflicts with `_progress/progress.md`, trust `_progress/progress.md` for completed task history and update handoff.
4. Read the latest relevant file in `_summary/`, if any.
5. Read the task plan referenced by `_handoff/current.md`, or the latest file in `_task/` if handoff has no task plan.
6. Read the spec referenced by that task plan.
7. Find the next task whose status is not `Done` and the current iteration recorded in `_handoff/current.md`.
8. Continue from that task and iteration without asking the original intake questions again unless the request, scope, or acceptance criteria are unclear.
9. Continue executing remaining tasks sequentially until all tasks are complete or a stop condition is reached; each executable task must complete the full 3-pass hardening loop before the next task starts.
10. Do not regenerate the entire spec unless the request changed.
11. If every task is `Done`, continue with any missing `_review/`, `_summary/`, handoff update, workflow health check, or final response steps.

## Questioning Rules

Questions should be focused and grouped. Do not ask a large questionnaire when a short set of questions will reach useful certainty.

Ask about:

- Goal and business/user value.
- Primary users and roles.
- Exact behavior and expected workflow.
- UI, API, data model, and state expectations.
- Edge cases and failure states.
- Constraints, dependencies, and compatibility requirements.
- Success criteria and verification.
- Explicitly out-of-scope work.

Stop questioning when the remaining unknowns are minor enough to document as assumptions, or when the user says to proceed.

## Spec Rules

Each spec in `_spec/` must be a detailed, implementation-aware execution blueprint. Use `Not applicable` for irrelevant sections. Do not delete required sections.

# Detailed Spec Template

## 1. Metadata
- Spec filename:
- Date:
- Request ID / slug:
- Request source:
- Execution mode:
- Request classification:
- Scope level:
- Risk level:

## 2. Original Request
- Raw user request:
- Normalized request:
- Source prompt / WORK_REQUEST reference:

## 3. Questions And Answers
- Questions asked:
- Answers received:
- Questions skipped:
- Remaining open questions:

## 4. Problem Definition
- Problem being solved:
- Why it matters:
- Current pain point:
- Expected value:

## 5. Current State Analysis
- Existing behavior:
- Existing architecture/components:
- Existing files/modules likely involved:
- Existing data flow:
- Existing API/UI/CLI/workflow behavior:
- Existing tests or verification coverage:

## 6. Desired End State
- Expected final behavior:
- User-facing outcome:
- Developer-facing outcome:
- System/workflow outcome:
- Backward compatibility expectations:

## 7. Scope
- In scope:
- Out of scope:
- Non-goals:
- Explicit boundaries:

## 8. Users And Use Cases
- Primary users:
- Secondary users:
- Main use cases:
- Edge use cases:

## 9. Functional Requirements
- Required behaviors:
- Inputs:
- Outputs:
- State changes:
- Error states:
- Permissions/auth expectations:

## 10. Non-Functional Requirements
- Performance expectations:
- Reliability expectations:
- Security/privacy expectations:
- Accessibility expectations:
- Maintainability expectations:
- DX expectations:

## 11. Affected Surfaces
- Files likely affected:
- Directories likely affected:
- UI surfaces:
- API routes:
- Components:
- Services:
- Database/schema:
- Config/env vars:
- Tests:
- Docs:
- Workflow artifacts:

## 12. Dependency And Integration Map
- Internal dependencies:
- External packages/services:
- Integration points:
- Ordering constraints:
- Migration/setup requirements:

## 13. Data And State Impact
- Data models:
- Database changes:
- State management changes:
- Cache/session/local storage impact:
- Backward compatibility impact:

## 14. UX / API / Workflow Expectations
- UX expectations:
- API contract expectations:
- CLI/workflow behavior:
- Error handling expectations:
- Empty/loading/success/failure states:

## 15. Execution Strategy
- Recommended implementation approach:
- Suggested sequencing:
- Safe rollout/migration approach:
- Files to inspect before editing:
- Decisions to avoid until more evidence exists:

## 16. Verification Strategy
- Required automated checks:
- Required manual checks:
- Test types needed:
- Build/lint/typecheck expectations:
- Acceptance evidence required:
- Proof of completion:

## 17. Acceptance Criteria
- [ ] Concrete measurable criterion 1
- [ ] Concrete measurable criterion 2
- [ ] Concrete measurable criterion 3

## 18. Edge Cases And Failure Modes
- Edge cases:
- Failure modes:
- Regression risks:
- Recovery expectations:

## 19. Risks And Mitigations
- Technical risks:
- Product/UX risks:
- Security risks:
- Scope risks:
- Mitigation plan:

## 20. Assumptions
- Explicit assumptions:
- Confidence level:
- What to revisit if assumptions are wrong:

## 21. Open Questions
- Blocking questions:
- Non-blocking questions:
- Execution impact:

## 22. Task Extraction Notes
- Suggested vertical task boundaries:
- Suggested first task:
- Suggested task ordering:
- Areas that should not become separate tasks:
- How the 3-pass Build -> Refine -> Polish loop should apply:

Use timestamped or slugged filenames, such as:

```txt
_spec/2026-05-10-add-dark-theme.md
```

## Task Planning Rules

Each task plan in `_task/` must include:

- Spec file used.
- Planning date.
- Progress and summary files read.
- Detailed spec sections used to derive or justify the task plan.
- Task list.

Task planning must be derived from the saved detailed spec, not from the raw request alone. The plan must cite or reference the detailed spec sections it used, especially affected surfaces, dependency and integration map, data and state impact, UX/API/workflow expectations, execution strategy, verification strategy, acceptance criteria, edge cases, risks and mitigations, assumptions, open questions, and task extraction notes.

Each task must include:

- Task ID.
- Status.
- Objective.
- Files likely affected.
- Checklist.
- Iteration plan for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
- Acceptance criteria.
- Acceptance result.
- Verification commands.
- Stop condition.
- Out-of-scope items.

Each iteration plan must include:

- Goal.
- Changes made.
- Verification command/result.
- Review findings.
- Acceptance status.
- Remaining issues.
- Next action.

Task statuses must follow this lifecycle:

```txt
Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done
```

Allowed terminal states:

- `Done`
- `Blocked`
- `Needs Human Review`

Rules:

- A task cannot be `Done` unless all three iterations are complete, verification was attempted in each iteration, the task was reviewed in each iteration, and final acceptance is complete.
- A task cannot move to `Reviewed` unless verification was attempted.
- If verification cannot run, the task can be `Needs Human Review`, not `Done`.
- A task cannot be `Done` unless every required acceptance criterion is checked `[x]`.
- If any acceptance result is `[ ]` or `[~]`, the task must be `Blocked` or `Needs Human Review`.
- If required iteration evidence is missing, the task cannot be `Done` and workflow health must be `Partial` or `Failed`.

Acceptance results use:

- `[x] Criterion met`
- `[ ] Criterion not met`
- `[~] Partially met with notes`

Tasks must be vertical slices. Prefer tasks like `TASK-001: Add theme toggle through settings and persist preference` over tasks like `TASK-001: Update frontend`.

## Ralph Wiggum Task Style

Tasks should be small enough that the agent can say exactly what it is doing without interpretation.

Good task shape:

- One concrete outcome.
- One narrow set of files.
- Plain verbs.
- No bundled refactors.
- Clear stop condition.
- Clear verification.

Example:

```md
### TASK-001: Add dark theme toggle in settings

Objective:
Add one visible settings toggle that switches the app between light and dark themes.
```

## Progress Tracking

Maintain `_progress/progress.md`.

`_progress/progress.md` is append-only task history. It records what happened over time and is authoritative for completed task history.

`_handoff/current.md` is the live resume state. Keep it updated with the current phase, active files, last completed task, current task, next task, blockers, verification status, and workflow health status.

After each task, append:

- Task ID.
- Status.
- Lifecycle transition reached.
- Files changed.
- Iteration evidence for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
- Acceptance result.
- Verification result.
- Failure recovery notes, if verification failed.
- Review result.
- Blockers.
- Next step.

Do not replace previous progress entries.

## Summary Rules

After implementation and before the final summary, create a review file in `_review/`.

The review must include:

- Request.
- Spec file used.
- Task plan used.
- Tasks reviewed.
- Bugs found.
- Scope creep check.
- Final diff audit.
- Failure recovery notes.
- Missing tests.
- Security concerns.
- Architecture concerns.
- Follow-up tasks.
- Final review verdict.

After the review is complete, create release notes in `_release/<request-id>.md`, then create or append a summary in `_summary/`.

The release note must include:

- Request.
- User-facing changes.
- Developer changes.
- New routes/APIs.
- New env vars.
- Database/schema changes.
- Dependencies added/removed.
- Test commands run.
- Known limitations.
- Follow-up work.
- Suggested commit message.

If there are no user-facing changes, say so. If there are no new APIs, env vars, dependencies, or schema changes, say `none`.

`_summary/` is completed workflow history. It records finished workflow runs and should not replace the live state in `_handoff/current.md`.

The summary must include:

- Request.
- Spec file used.
- Whether the detailed spec was complete or had gaps, including any missing required sections and whether they were repaired before planning.
- Task plan used.
- Review file used.
- Tasks completed.
- Iteration evidence summary.
- Files changed.
- Verification run.
- Acceptance results.
- Failure recovery notes.
- Final diff audit.
- Release notes file used.
- Unresolved issues.
- Next recommended work.

## Workflow Health Check

Before the final response, check:

- Did `WORK_REQUEST.md` sync?
- Did `_handoff/current.md` exist and reflect the latest workflow state?
- Did the spec file exist?
- Did the spec include every required detailed spec section, or was any missing section repaired before planning?
- Did the task plan exist?
- Was progress updated?
- Was the review created?
- Was the summary created?
- Were release notes created?
- Was required iteration evidence recorded for every executable task?
- Was the final diff audit completed or documented?
- Was the dirty worktree checked?
- Were acceptance results completed?
- Were verification commands run or documented?
- Was scope respected?
- Were decisions recorded if needed?

Final health status must be one of:

- `Passed`
- `Partial`
- `Failed`

`Passed` requires a synced work request, a detailed spec with every required section, a task plan derived from and citing or referencing the detailed spec, progress, handoff, review, summary, release notes, required iteration evidence for every executable task, final diff audit completed or documented, dirty worktree checked, acceptance results completed, verification run or documented, scope respected, and decisions recorded if needed.

If release notes, final diff audit, dirty worktree check, required detailed spec sections, iteration evidence, or acceptance results are missing, health must be `Partial` or `Failed` depending on severity. If any required artifact is missing, mark workflow health as `Failed`.

## Implementation Boundaries

Agents must not:

- Touch implementation code before questions, spec, and task plan are complete.
- Implement without a saved spec in `_spec/`.
- Implement without a saved task plan in `_task/`.
- Implement more than one active task at a time.
- Expand scope beyond the request and active task.
- Rewrite large parts of the application without explicit approval.
- Introduce new dependencies unless the active task requires them and the reason is documented.
- Change deployment configuration unless the active task requires it.
- Hard-code secrets, API keys, tokens, credentials, or environment-specific URLs.
- Duplicate server state into client global state.
- Expose sensitive fields such as `passwordHash`, tokens, or private user data.
- Remove tests or weaken validation to make a task pass.
- Create fake application code to satisfy the workflow.
- Run destructive commands such as `git reset --hard`, `git clean -fd`, or force pushes unless explicitly instructed.

## Architecture Guidance

Default MERN structure:

```txt
client/
  src/
    components/
    hooks/
      queries/
      mutations/
    lib/
    pages/
    redux/
    routes/
    services/
    styles/
    utils/
  test/

server/
  config/
  controllers/
  middleware/
  models/
  routes/
  tests/
  utils/
```

Guidelines:

- Prefer existing project conventions over new patterns.
- Keep UI components focused on rendering and interaction.
- Put frontend API calls in service files or query/mutation hooks.
- Use a shared frontend API client when the stack supports it.
- Use a server-state library for fetched data when the project already has one.
- Use global client state only for client-owned state.
- Keep backend route handlers thin; move business logic into services or utilities when it grows.
- Validate input at API boundaries.
- Keep persistence models authoritative for data rules.
- Document meaningful architecture or product decisions in `_decisions/`. Keep `docs/DECISIONS.md` for durable project-level decision guidance when useful.

## Testing Expectations

Use the narrowest validation that proves the active task works, then broaden when risk is higher.

Common commands:

```bash
# Frontend
cd client && npm test
cd client && npm run lint
cd client && npm run build

# Backend
cd server && npm test
cd server && npm run lint

# Full project, if configured
npm test
npm run lint
npm run build
npm run typecheck
```

If tests or scripts are missing:

- State that they are missing.
- Recommend the command that should exist.
- Use available manual verification.
- Record the gap in `_progress/progress.md` and the final `_summary/` entry.

## Git Workflow Guidance

- Check `git status --short` before and after edits.
- Do not overwrite user changes.
- Keep commits task-sized.
- Use clear commit messages:

  ```txt
  <type>: <short task summary>
  ```

- Do not commit unless explicitly instructed.
- Before preparing a commit, summarize files changed, validation run, risks, and follow-up work.

## Stop Conditions

Stop and ask for direction when:

- The work request is ambiguous enough that implementation could go in multiple incompatible directions.
- Acceptance criteria conflict with the specification.
- The implementation requires credentials or access that is unavailable.
- A destructive migration or data loss is possible.
- The task requires changing public API contracts beyond the stated scope.
- The task requires introducing a new paid service or dependency.
- Existing uncommitted changes overlap with the files needed and intent is unclear.
- Tests fail for reasons unrelated to the current task and the fix would be out of scope.
- The request is broad but no safe first vertical task can be identified.

## Final Response Format

At the end of a workflow run, report:

- Request classification.
- Spec file used.
- Whether the detailed spec was complete or had gaps.
- Task plan used.
- Tasks completed.
- Iteration evidence summary.
- Files changed.
- Verification commands and results.
- Progress updated in `_progress/progress.md`.
- Handoff updated in `_handoff/current.md`.
- Review updated in `_review/<file>.md`.
- Release notes updated in `_release/<file>.md`.
- Summary updated in `_summary/`.
- Decisions updated in `_decisions/<file>.md` or `none`.
- Workflow health status: `Passed`, `Partial`, or `Failed`.
- Final artifact checklist with exact paths:
  - Work request: `WORK_REQUEST.md`
  - Handoff: `_handoff/current.md`
  - Spec: `_spec/<file>.md`
  - Task plan: `_task/<file>.md`
  - Progress: `_progress/progress.md`
  - Review: `_review/<file>.md`
  - Release notes: `_release/<file>.md`
  - Summary: `_summary/<file>.md`
  - Decisions: `_decisions/<file>.md` or `none`
- Unresolved issues or recommended next task.
- Suggested commit message.
