# Run Workflow

This is the master orchestration prompt for a reusable AI engineering workflow. It turns either the latest direct user prompt or `WORK_REQUEST.md` into clarified, specified, planned, verified engineering work.

## Command To Agent

Use the latest direct user prompt as the primary request source when it looks like project work. Sync it into `WORK_REQUEST.md`, then execute this workflow exactly.

Before touching code, ask focused clarifying questions until you reach about 90% understanding. If the user explicitly says `skip questions`, generate a best-effort detailed spec and record assumptions.

Default execution mode is `complete-workflow`. Do not stop after `TASK-001` unless the user explicitly selected `single-task` or a stop condition is reached.

Execution modes:

- `plan-only`: ask questions, write spec, write task plan, then stop.
- `single-task`: execute only the next ready task through the full 3-pass hardening loop, update artifacts, then stop.
- `complete-workflow`: execute all generated tasks sequentially until the request/spec is complete or a stop condition is reached; each executable task must complete the full 3-pass hardening loop before the next task starts.
- `parallel-workflow`: orchestrator plans tasks, marks parallel safety, creates queue/claims/locks, assigns worker agents when safe, then performs merge review, final verification, review, release notes, summary, handoff, and health check.
- `parallel-worker`: worker reads the saved workflow context, claims exactly one eligible parallel-safe task, records claims and file locks before editing, completes Build -> Refine -> Polish for that task, records final task status, releases locks, and stops.
- `parallel-orchestrator`: orchestrator manages the task queue, validates claims and locks, reviews worker outputs, resolves conflicts or creates follow-up tasks, runs final verification, and completes final artifacts.

Sequential `complete-workflow` remains the fallback. Use 1 worker only when dependency or file-lock safety requires sequential execution.

Do not implement without:

1. A saved detailed spec in `_spec/`.
2. A saved vertical task plan in `_task/`.
3. A current read of `_handoff/current.md`.
4. A current read of `_progress/progress.md`.
5. A current read of the latest relevant `_summary/` entry.
6. Task status transitions that follow `Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done`.
7. Documented iteration evidence for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish for each executable task.

## Pipeline

```txt
direct user prompt or WORK_REQUEST
-> sync WORK_REQUEST
-> questions
-> spec in _spec
-> read _progress and _summary
-> read or create _handoff/current.md
-> vertical plan in _task
-> execute every task in order by default, or prepare _parallel queue/claims/locks when parallel mode is selected and safe
-> run each executable task through Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish
-> verify, review, and record evidence inside each iteration
-> update _progress after each task
-> update _handoff/current.md after each task
-> in parallel modes, orchestrator validates claims, locks, worker status, and merge review
-> final diff audit
-> review in _review
-> release notes in _release
-> final summary in _summary
-> update _handoff/current.md
-> health check
```

## 1. Resolve Active Request

Read:

- Latest user prompt in the current conversation.
- `WORK_REQUEST.md`.
- `AGENTS.md`.
- `docs/PROJECT_CONTEXT.md`.
- `_handoff/current.md`, creating it if missing.
- `_progress/progress.md`, creating it if missing.
- The latest relevant file in `_summary/`, if any.

If `_handoff/`, `_spec/`, `_task/`, `_progress/`, `_review/`, `_summary/`, `_release/`, `_decisions/`, or `_parallel/` is missing, create it before continuing. If `_handoff/current.md` is missing, create it from the handoff template. If `_progress/progress.md` is missing, create it with an initial heading. If parallel mode is selected and `_parallel/claims.md`, `_parallel/locks.md`, or `_parallel/agent-status.md` is missing, create it from the parallel templates before workers claim tasks.

Request source rules:

- If the latest user prompt looks like project work, it is the active request.
- Project work includes prompts like `generate mern boilerplate`, `implement login feature`, `fix dashboard bug`, `audit security`, or `refactor auth`.
- If there is no direct project-work prompt, use the request stored in `WORK_REQUEST.md`.
- Do not require the user to manually edit workflow docs before proceeding.

Sync the active request into `WORK_REQUEST.md` before questioning and planning. Preserve useful optional context when present, but make the latest active request obvious.

Before planning, read `_handoff/current.md` if it exists. If no handoff exists, create it and populate the current request, request ID, current phase, known artifact paths, blockers, verification status, workflow health status, suggested next prompt, and continuation notes.

## 1A. Continue Workflow Command

If the active user prompt is exactly or primarily `continue workflow`, resume instead of restarting intake:

1. Read `_handoff/current.md` first and use it as the primary resume source.
2. If no handoff exists, create it, then fall back to `_progress/progress.md`, the latest relevant `_summary/`, the latest `_task/`, and the referenced spec to reconstruct the live state.
3. Read `_progress/progress.md` to verify completed task history.
4. If `_handoff/current.md` conflicts with `_progress/progress.md`, trust `_progress/progress.md` for completed task history and update handoff accordingly.
5. Read the latest relevant file in `_summary/`, if any.
6. Read the task plan referenced by `_handoff/current.md`, or the latest file in `_task/` if handoff has no task plan.
7. Read the spec referenced by that task plan.
8. Find the next task whose status is not `Done` and the current iteration recorded in `_handoff/current.md`.
9. Continue from that task and iteration.
10. Do not ask the original intake questions again unless a current ambiguity blocks safe continuation.
11. Do not regenerate the entire spec unless the request changed.
12. Continue executing remaining tasks sequentially until all tasks are complete or a stop condition is reached, preserving the Build -> Refine -> Polish loop for each executable task.
13. If all tasks are `Done`, complete any missing `_review/`, `_summary/`, handoff update, workflow health check, or final response step.

## 2. Intake And Questioning

Do not touch code in this phase.

Ask focused clarifying questions until there is about 90% understanding of the request. Ask fewer questions for tiny, obvious requests. Group questions so the user can answer efficiently.

Clarify:

- Goal.
- Users.
- Exact behavior.
- Edge cases.
- UI expectations.
- API expectations.
- Data model expectations.
- Constraints.
- Success criteria.
- What is out of scope.

If the prompt explicitly says `skip questions`:

- Do not ask questions.
- Generate the best possible spec from available context.
- Record assumptions and open questions in the spec.

Stop questioning when:

- The user has answered enough to proceed.
- The remaining unknowns are minor and can be documented as assumptions.
- The user explicitly says to proceed.

## 3. Classify Request

Classify the request as one primary type:

- `feature`: Adds user-facing or system behavior.
- `bugfix`: Fixes broken behavior.
- `boilerplate`: Creates project structure or starter configuration.
- `security`: Audits or improves security.
- `refactor`: Improves structure without intentional behavior change.
- `test`: Adds or repairs tests.
- `docs`: Updates documentation only.
- `ops`: Changes deployment, CI, environment, or infrastructure.
- `research`: Investigates and reports without implementation.

Also identify:

- Scope: `small`, `medium`, or `large`.
- Risk: `low`, `medium`, or `high`.
- Whether implementation is allowed after spec and plan.
- Whether any open question blocks implementation.

Stop if the request is too broad, unsafe, destructive, or unclear.

## 4. Repo Intake

Inspect the repository before planning changes.

Required intake:

- Check `git status --short`.
- Document dirty worktree protection:
  - Existing dirty files.
  - Files planned for this workflow.
  - Overlap risk.
- Identify package manager and major languages/frameworks.
- Identify test, lint, build, and typecheck commands from package/config files.
- Identify existing architecture conventions.
- Identify likely files affected by the request.
- Note constraints, missing tooling, and unknowns.

Update `docs/PROJECT_CONTEXT.md` only with durable findings. Do not turn temporary observations into permanent rules unless they are clear from the repo.

Dirty worktree rules:

- If dirty files overlap with planned files, stop and ask before editing.
- If dirty files are unrelated, continue but document them in the spec, task plan, `_handoff/current.md`, and `_progress/progress.md`.
- Never overwrite user changes.
- Never clean or reset files unless explicitly instructed.

## 5. Spec Phase

Generate a detailed, implementation-aware execution blueprint from the active request, intake answers, repo intake, dirty worktree status, handoff/progress context, latest relevant summary, and durable project docs.

Save the spec in `_spec/` using a timestamped or slugged filename:

```txt
_spec/2026-05-10-add-dark-theme.md
```

The spec must be detailed but not padded. Use `Not applicable` for irrelevant sections instead of deleting them.

Detailed spec required sections:

1. Metadata:
   - Spec filename.
   - Date.
   - Request ID / slug.
   - Request source.
   - Execution mode.
   - Request classification.
   - Scope level.
   - Risk level.
2. Original Request:
   - Raw user request.
   - Normalized request.
   - Source prompt / WORK_REQUEST reference.
3. Questions And Answers:
   - Questions asked.
   - Answers received.
   - Questions skipped.
   - Remaining open questions.
4. Problem Definition:
   - Problem being solved.
   - Why it matters.
   - Current pain point.
   - Expected value.
5. Current State Analysis:
   - Existing behavior.
   - Existing architecture/components.
   - Existing files/modules likely involved.
   - Existing data flow.
   - Existing API/UI/CLI/workflow behavior.
   - Existing tests or verification coverage.
6. Desired End State:
   - Expected final behavior.
   - User-facing outcome.
   - Developer-facing outcome.
   - System/workflow outcome.
   - Backward compatibility expectations.
7. Scope:
   - In scope.
   - Out of scope.
   - Non-goals.
   - Explicit boundaries.
8. Users And Use Cases:
   - Primary users.
   - Secondary users.
   - Main use cases.
   - Edge use cases.
9. Functional Requirements:
   - Required behaviors.
   - Inputs.
   - Outputs.
   - State changes.
   - Error states.
   - Permissions/auth expectations.
10. Non-Functional Requirements:
   - Performance expectations.
   - Reliability expectations.
   - Security/privacy expectations.
   - Accessibility expectations.
   - Maintainability expectations.
   - DX expectations.
11. Affected Surfaces:
   - Files likely affected.
   - Directories likely affected.
   - UI surfaces.
   - API routes.
   - Components.
   - Services.
   - Database/schema.
   - Config/env vars.
   - Tests.
   - Docs.
   - Workflow artifacts.
12. Dependency And Integration Map:
   - Internal dependencies.
   - External packages/services.
   - Integration points.
   - Ordering constraints.
   - Migration/setup requirements.
13. Data And State Impact:
   - Data models.
   - Database changes.
   - State management changes.
   - Cache/session/local storage impact.
   - Backward compatibility impact.
14. UX / API / Workflow Expectations:
   - UX expectations.
   - API contract expectations.
   - CLI/workflow behavior.
   - Error handling expectations.
   - Empty/loading/success/failure states.
15. Execution Strategy:
   - Recommended implementation approach.
   - Suggested sequencing.
   - Safe rollout/migration approach.
   - Files to inspect before editing.
   - Decisions to avoid until more evidence exists.
16. Verification Strategy:
   - Required automated checks.
   - Required manual checks.
   - Test types needed.
   - Build/lint/typecheck expectations.
   - Acceptance evidence required.
   - Proof of completion.
17. Acceptance Criteria:
   - Checklist format only.
   - Concrete, measurable, verifiable items.
   - Behavior and artifact/documentation criteria when relevant.
18. Edge Cases And Failure Modes:
   - Edge cases.
   - Failure modes.
   - Regression risks.
   - Recovery expectations.
19. Risks And Mitigations:
   - Technical risks.
   - Product/UX risks.
   - Security risks.
   - Scope risks.
   - Mitigation plan.
20. Assumptions:
   - Explicit assumptions.
   - Confidence level.
   - What to revisit if assumptions are wrong.
21. Open Questions:
   - Blocking questions.
   - Non-blocking questions.
   - Execution impact.
22. Task Extraction Notes:
   - Suggested vertical task boundaries.
   - Suggested first task.
   - Suggested task ordering.
   - Areas that should not become separate tasks.
   - How the 3-pass Build -> Refine -> Polish loop should apply.

No implementation may happen until this file exists.

## 6. Planning Phase

Before planning, read:

- `_handoff/current.md`, if it exists.
- `_progress/progress.md`.
- The latest relevant `_summary/` entry.
- The saved detailed spec in `_spec/`.
- Relevant durable docs in `docs/`.

Generate a vertical implementation plan from the saved detailed spec. Derive tasks from the spec's affected surfaces, dependency/integration map, data/state impact, UX/API/workflow expectations, execution strategy, verification strategy, acceptance criteria, edge cases, risks, assumptions, open questions, and task extraction notes.

Save the task breakdown in `_task/` using a timestamped or slugged filename that matches the spec when practical:

```txt
_task/2026-05-10-add-dark-theme.md
```

Tasks must be vertical slices, not vague layers. A vertical task should produce a user-visible or independently verifiable result.

Each task must include:

- Task ID.
- Status.
- Priority: `P0`, `P1`, or `P2`.
- Parallel safe: `yes` or `no`.
- Depends on.
- Blocks.
- File locks.
- Claim status: `unclaimed`, `claimed`, `in-progress`, `done`, `blocked`, or `needs-review`.
- Claimed by.
- Agent role.
- Merge risk: `low`, `medium`, or `high`.
- Objective.
- Files likely affected.
- Checklist.
- Iteration plan for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
- Acceptance criteria.
- Acceptance result.
- Verification commands.
- Stop condition.
- Out-of-scope items.

Each task's Iteration plan must include these fields for every iteration:

- Goal.
- Changes made.
- Verification command/result.
- Review findings.
- Acceptance status.
- Remaining issues.
- Next action.

Each task status must follow this lifecycle:

```txt
Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done
```

Allowed terminal states:

- `Done`
- `Blocked`
- `Needs Human Review`

Status rules:

- A task cannot be `Done` unless all three iterations are complete, verification was attempted in each iteration, the task was reviewed in each iteration, and final acceptance is complete.
- A task cannot move to `Reviewed` unless verification was attempted.
- If verification cannot run, the task can be `Needs Human Review`, not `Done`.
- A task cannot be `Done` unless every required acceptance criterion is checked `[x]`.
- If any required acceptance result is `[ ]` or `[~]`, the task must be `Blocked` or `Needs Human Review`.
- Missing iteration evidence makes the task incomplete and the workflow health `Partial` or `Failed`.

Acceptance results must use this format:

```md
Acceptance result:
- [x] Criterion met
- [ ] Criterion not met
- [~] Partially met with notes
```

Acceptance results must be copied or summarized in `_progress/progress.md`.

Use Ralph Wiggum-style task phrasing: small, literal, concrete steps with simple verbs and clear boundaries.

No implementation may happen until this file exists.

After task plan creation:

- If execution mode is `plan-only`, stop after saving the spec and task plan.
- If execution mode is `single-task`, execute only the next ready task through the full 3-pass hardening loop, update artifacts, then stop.
- If execution mode is omitted, use `complete-workflow`.
- In `complete-workflow`, execute every task in order by default; each task must complete the full 3-pass hardening loop before the next task starts.
- If execution mode is `parallel-workflow`, the orchestrator must rank tasks by priority, mark tasks as parallel-safe or not, detect dependencies and file overlap, create or update `_parallel/claims.md`, `_parallel/locks.md`, `_parallel/agent-status.md`, update `_handoff/current.md`, then assign workers only for unblocked tasks with non-overlapping file locks.
- If execution mode is `parallel-worker`, do not plan or run final workflow artifacts. Claim exactly one eligible task, complete that task, record final task status, release locks, and stop.
- If execution mode is `parallel-orchestrator`, manage queue/claim/lock validation, merge review, final verification, review, release notes, summary, handoff, and health check.
- Do not create the final summary until all executable tasks are completed or a stop condition is reached.

## 7. Execution Phase

Execute one task at a time in the default sequential `complete-workflow` mode, continuing through every task in order until the full request/spec is complete or a stop condition is reached. Sequential behavior is always the fallback when dependencies, file locks, or merge risk make parallel execution unsafe.

Every executable task must run through this required 3-pass task hardening loop:

1. Iteration 1 - Build: implement the smallest working vertical slice, run verification, review against acceptance criteria, and record issues, gaps, failed checks, and the next refinement target.
2. Iteration 2 - Refine: fix issues found in Iteration 1, improve correctness, edge cases, tests, structure, naming, typing, reliability, and project consistency, run verification again, review again, and record what improved and what remains.
3. Iteration 3 - Polish: perform final cleanup and hardening, remove rough edges, tighten tests, docs, types, and error handling where relevant, confirm no regressions, run final task verification, and produce the final task verdict.

Do not blindly repeat work. Every iteration must have a clear purpose and documented evidence. Each iteration must include:

- Goal.
- Changes made.
- Verification command/result.
- Review findings.
- Acceptance status.
- Remaining issues.
- Next action.

Each task must complete this lifecycle before the next task starts:

```txt
Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done
```

For each task:

1. Read latest `_handoff/current.md`.
2. Read latest `_progress/progress.md`.
3. Read the latest relevant `_summary/` entry.
4. Read the saved spec and task plan.
5. If `_handoff/current.md` conflicts with `_progress/progress.md`, trust `_progress/progress.md` for completed task history and update handoff.
6. Inspect only the relevant codebase area.
7. Move the task to `In Progress` and set `_handoff/current.md` to the current task and current iteration.
8. Run Iteration 1 - Build.
9. Run Iteration 2 - Refine.
10. Run Iteration 3 - Polish.
11. In every iteration, run verification commands or record why they could not run.
12. If verification fails during any iteration, follow the failure recovery protocol in section 8A inside that iteration.
13. In every iteration, record acceptance status for every relevant acceptance criterion.
14. In every iteration, critique and review the result.
15. Fix only in-scope defects for the current iteration.
16. Move the task to `Verified` only after final task verification is attempted and all iteration verification results are documented.
17. Move the task to `Reviewed` only after the Iteration 3 final review is complete and all iteration review findings are documented.
18. Move the task to `Done` only after all three iterations are complete, final verification and review are documented, and all required acceptance results are checked `[x]`.
19. Append progress to `_progress/progress.md`, including separate evidence for each iteration, acceptance results, and failure recovery notes.
20. Update `_handoff/current.md` with the last completed task, current task, current iteration, next task, blockers, dirty worktree status, acceptance status, verification status, iteration evidence status, workflow health status, and suggested next prompt.
21. Continue to the next task automatically only when the current task is `Done`.

Do not start the next task if the current task is `Blocked`, `Needs Human Review`, risky, unclear, unverified, outside scope, has unresolved in-scope defects, fails verification, or requires external access.

Stop if:

- A task is `Blocked`.
- A task is `Needs Human Review`.
- Verification remains failed after iteration-level failure recovery.
- Scope becomes unclear.
- Risk increases beyond the saved spec and task plan.
- External access or credentials are needed.
- The active execution mode is explicit `single-task` and the current task has completed the full 3-pass hardening loop, been verified, reviewed, documented, and stopped.

## 7A. Parallel Orchestrator Phase

In `parallel-workflow` or `parallel-orchestrator` mode, the orchestrator owns intake, detailed spec creation, and task planning. Worker agents must not create or replace the saved spec or task plan.

The orchestrator must:

1. Rank all tasks by priority: `P0` before `P1` before `P2`.
2. Mark every task as parallel-safe `yes` or `no`.
3. Document dependencies in `Depends on` and `Blocks`.
4. Declare expected file locks for each task before any worker edits files.
5. Classify merge risk as `low`, `medium`, or `high`.
6. Create or update `_parallel/claims.md`, `_parallel/locks.md`, and `_parallel/agent-status.md`.
7. Update `_handoff/current.md` with queue status, active worker count, claim status, lock status, and merge-review status.
8. Default worker agents: 3 when enough safe work exists.
9. Minimum parallel workers: use at least 2 workers when there are 2 or more parallel-safe unblocked tasks with non-overlapping file locks.
10. Maximum worker agents: 5.
11. Use fewer workers when tasks conflict, share files, depend on each other, or have elevated merge risk.
12. Fallback worker count: use 1 worker only when dependency safety or file-lock safety requires sequential execution.

Among same-priority tasks, assign the task with the lowest dependency risk and lowest merge risk first.

## 7B. Parallel Worker Phase

In `parallel-worker` mode, each worker must read:

- `AGENTS.md`
- `RUN_WORKFLOW.md`
- the saved spec in `_spec/`
- the saved task plan in `_task/`
- `_parallel/claims.md`
- `_parallel/locks.md`
- `_parallel/agent-status.md`
- `_progress/progress.md`
- `_handoff/current.md`

Each worker must:

1. Claim exactly one unclaimed, highest-priority, parallel-safe, unblocked task.
2. Confirm the task's file locks do not overlap with active locks in `_parallel/locks.md`.
3. Record the claim and file locks before editing.
4. Mark the task `in-progress` in claims and agent status.
5. Run the claimed task through Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
6. Update `_progress/progress.md` with separate iteration evidence, acceptance results, claim status, file locks, worker identity, verification, review, and final status.
7. Mark the task `done`, `blocked`, or `needs-review`.
8. Release locks only after final task status is recorded.
9. Stop after one claimed task.

Workers must not run final global review, release notes, summary, or health check unless explicitly acting as the orchestrator.

## 7C. Parallel Locking And Merge Review

File locks must be declared before editing. No two workers may claim tasks with overlapping file locks. If a worker needs a file locked by another active worker, the worker must stop or choose another eligible task. If unexpected file overlap appears after a claim, the worker must stop, mark the task `needs-review`, record the overlap in `_parallel/claims.md` and `_parallel/locks.md`, and update `_handoff/current.md`.

After workers finish, the orchestrator must:

1. Read all worker progress entries and task outputs.
2. Check `_parallel/claims.md`, `_parallel/locks.md`, and `_parallel/agent-status.md`.
3. Confirm no overlapping active file locks remain.
4. Confirm every worker task has Build -> Refine -> Polish evidence.
5. Run the final diff audit.
6. Resolve conflicts or create follow-up tasks.
7. Run final verification.
8. Write review, release notes, summary, final handoff, and health check.

Workflow health must be `Partial` or `Failed` if claims, locks, worker status, iteration evidence, merge review, or final verification are missing for parallel execution.

## 8. Verification

Verification should match the task risk and must run, or be explicitly documented as unable to run, in each task iteration.

Use available commands such as:

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

For split apps, use project-specific commands such as:

```bash
cd client && npm test
cd client && npm run build
cd server && npm test
```

If commands are missing or cannot run, document the reason in `_progress/progress.md` and the final `_summary/` entry. Provide the best manual verification available.

If verification cannot run in any required iteration, do not mark the task `Done`. Mark it `Needs Human Review` and stop unless the user explicitly directs a different safe path.

## 8A. Failure Recovery Protocol

When verification fails during any iteration, follow this fixed recovery protocol inside that iteration:

1. Identify the failing command.
2. Capture the failing test or error.
3. Classify the failure as in-scope or unrelated.
4. Fix only the in-scope failure.
5. Re-run the exact failing command.
6. If fixed, continue.
7. If still failing after a reasonable targeted fix, mark the task `Needs Human Review`.
8. Update the iteration evidence and `_progress/progress.md` with the failure, fix attempt, and final result.

Failure recovery rules:

- Do not start broad refactors during failure recovery.
- Do not change unrelated code to make tests pass.
- If the failure is unrelated, document it and continue only if the active task is verified another way.
- If verification cannot prove the task, stop with `Needs Human Review`.
- Add failure recovery notes to the iteration evidence, `_progress/progress.md`, `_review/<request-id>.md`, and `_summary/<request-id>.md`.

## 9. Progress Tracking

Maintain `_progress/progress.md`.

`_progress/progress.md` is append-only task history. It records what happened over time and is authoritative for completed task history.

`_handoff/current.md` is the live resume state. It records where the workflow is now so another agent/session can continue without rereading the entire conversation.

After each task, append:

- Task ID.
- Status.
- Lifecycle transition reached.
- Files changed.
- Iteration evidence for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
- Acceptance result.
- Verification result.
- Failure recovery notes, if any.
- Review result.
- Blockers.
- Next step.

Do not rewrite previous progress entries except to correct factual errors.

After each task and before any stop, update `_handoff/current.md` with the current task and current iteration. Do not leave handoff stale after task execution.

## 10. Final Diff Audit

Before final review and summary, inspect the final diff.

Required commands when available:

```bash
git diff --stat
git diff
```

Document:

- Does the diff match the saved spec?
- Were unrelated files touched?
- Were workflow artifacts updated correctly?
- Were tests added or updated for changed behavior?
- Any accidental scope creep?
- Any generated junk or temporary files?
- Any sensitive values/secrets accidentally added?

Add final diff audit results to `_review/<request-id>.md`, `_summary/<request-id>.md`, and the final response. If `git diff` cannot run, document why.

## 11. Review Phase

After implementation, required iteration evidence, and before the final summary, create a review file in `_review/`.

Use a timestamped or slugged filename:

```txt
_review/2026-05-10-add-dark-theme.md
```

The review must include:

- Request.
- Spec file used.
- Task plan used.
- Tasks reviewed.
- Iteration evidence reviewed for every executable task.
- Bugs found.
- Scope creep check.
- Final diff audit.
- Failure recovery notes.
- Missing tests.
- Security concerns.
- Architecture concerns.
- Follow-up tasks.
- Final review verdict.

If in-scope defects are found, fix them before summary and rerun relevant verification. If defects cannot be fixed safely, stop with `Needs Human Review`.

## 12. Release Notes Phase

After the review is complete and before the final summary, create release notes in `_release/`.

Use the request ID as the filename:

```txt
_release/<request-id>.md
```

Each release note must include:

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

## 13. Summary Phase

After the review is complete, create or append a summary in `_summary/`.

Do not create the final summary until all executable tasks are completed or a stop condition is reached.

`_summary/` is completed workflow history. It records finished workflow runs and should not replace the live resume state in `_handoff/current.md`.

The summary should include:

- Request.
- Spec file used.
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

Use a timestamped or slugged filename when creating a new summary:

```txt
_summary/2026-05-10-add-dark-theme.md
```

After the summary is written, update `_handoff/current.md` with the summary file, workflow health status if known, unresolved issues, and the suggested next prompt.

## 14. Decision Logs

Use `_decisions/` for meaningful architecture or product decisions only. Do not create decision files for routine edits.

Each decision file must include:

- Date.
- Decision.
- Context.
- Options considered.
- Selected option.
- Consequences.
- Affected files.
- Follow-up tasks.

If no meaningful decision file was needed, report decisions as `none` in the final artifact checklist.

## 15. Critique And Fix

Before finalizing each task, review the result.

Check for:

- Scope creep.
- Broken acceptance criteria.
- Security regressions.
- Missing error states.
- Test gaps.
- Over-complex implementation.
- Inconsistent project conventions.

Fix only defects within the active task. Create follow-up tasks for anything larger.

## 16. Workflow Health Check

Before the final response, check:

- Did `WORK_REQUEST.md` sync?
- Did `_handoff/current.md` exist and reflect the latest live resume state?
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
- For parallel modes, did every task include priority, parallel-safe flag, dependencies, file locks, claim status, claimed by, agent role, and merge risk?
- For parallel modes, were `_parallel/claims.md`, `_parallel/locks.md`, and `_parallel/agent-status.md` updated?
- For parallel modes, were there no overlapping active file locks?
- For parallel modes, did every worker task record Build -> Refine -> Polish evidence?
- For parallel modes, did the orchestrator complete merge review and final verification?

Final health status:

- `Passed`: all required artifacts exist, the detailed spec exists with all required sections, all executable tasks are complete, all required iteration evidence is present, release notes exist, final diff audit is complete or documented, dirty worktree protection was checked, acceptance results are complete, verification was run or documented, scope was respected, and decisions were handled correctly.
- `Partial`: artifacts exist, but some tasks remain because of a documented blocker, human-review need, verification gap, follow-up risk, missing parallel merge review, or incomplete claim/lock evidence.
- `Failed`: any required artifact is missing, the detailed spec is missing required sections and planning proceeded anyway, scope was not respected, required verification/review/summary documentation is absent, or parallel execution proceeded with overlapping active file locks.

If release notes, final diff audit, dirty worktree check, required detailed spec sections, iteration evidence, acceptance results, claims, locks, worker status, or parallel merge review are missing when required, health should be `Partial` or `Failed` depending on severity. If any required artifact is missing, mark workflow health as `Failed`.

## 17. Final Response

End with:

- Request classification.
- Spec file used.
- Task plan used.
- Tasks completed.
- Iteration evidence summary.
- Files changed.
- Verification commands and results.
- Progress update location.
- Handoff update location.
- Review location.
- Release notes location.
- Summary location.
- Decisions location or `none`.
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
- Final diff audit result.
- Known blockers or unresolved issues.
- Recommended next step.
- Suggested commit message.

Do not claim a commit was made unless the user explicitly asked for a commit and it was actually created.
