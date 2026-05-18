# Reusable Agent Prompts

Use these prompts with OpenAI Codex, Claude Code, Cursor, or similar coding agents. Replace placeholders before running.

## Universal Work Request

```txt
Read RUN_WORKFLOW.md and execute it using WORK_REQUEST.md.

Follow AGENTS.md.
Ask clarifying questions until about 90% understanding before touching code unless the request says "skip questions".
Generate a saved detailed spec in _spec/, generate a vertical task plan in _task/ from that spec with an Iteration plan, execute one Ralph Wiggum-style task at a time through Build -> Refine -> Polish, record iteration evidence in _progress/progress.md, write a final summary in _summary/, then provide a final response and suggested commit message.
```

## Direct Request With Questions

```txt
Use this as the active request:
<REQUEST>

Follow RUN_WORKFLOW.md.
First ask focused clarifying questions about goal, users, exact behavior, edge cases, UI/API expectations, data model, constraints, success criteria, and out-of-scope work.
Do not touch code until questions are answered, a detailed spec is saved in _spec/, and a task plan derived from it is saved in _task/.
```

## Direct Request That Skips Questions

```txt
Use this as the active request:
<REQUEST>

skip questions

Follow RUN_WORKFLOW.md.
Generate a best-effort detailed spec in _spec/ and clearly list assumptions.
Generate a vertical task plan in _task/ from that spec.
Before implementation, read _progress/progress.md and the latest relevant _summary/ entry.
Then execute tasks one at a time through the full Build -> Refine -> Polish hardening loop only if safe.
```

## Intake Questions

```txt
Read WORK_REQUEST.md and AGENTS.md.

Ask the fewest focused questions needed to reach about 90% understanding.

Clarify:
1. Goal.
2. Users.
3. Exact behavior.
4. Edge cases.
5. UI expectations.
6. API expectations.
7. Data model expectations.
8. Constraints.
9. Success criteria.
10. Out-of-scope items.

Do not inspect or edit implementation code yet.
```

## Spec Generation

```txt
Using the active request, intake answers, repo intake, dirty worktree status, _handoff/current.md, _progress/progress.md, the latest relevant _summary/ entry, and durable project docs, generate a detailed, implementation-aware execution blueprint.

Save it in _spec/ with a timestamped or slugged filename, for example:
_spec/2026-05-10-add-dark-theme.md

The spec must be detailed but not padded. Use "Not applicable" for irrelevant sections instead of deleting them.

Include these required sections:
1. Metadata
   - Spec filename
   - Date
   - Request ID / slug
   - Request source
   - Execution mode
   - Request classification
   - Scope level
   - Risk level
2. Original Request
   - Raw user request
   - Normalized request
   - Source prompt / WORK_REQUEST reference
3. Questions And Answers
   - Questions asked
   - Answers received
   - Questions skipped
   - Remaining open questions
4. Problem Definition
   - Problem being solved
   - Why it matters
   - Current pain point
   - Expected value
5. Current State Analysis
   - Existing behavior
   - Existing architecture/components
   - Existing files/modules likely involved
   - Existing data flow
   - Existing API/UI/CLI/workflow behavior
   - Existing tests or verification coverage
6. Desired End State
   - Expected final behavior
   - User-facing outcome
   - Developer-facing outcome
   - System/workflow outcome
   - Backward compatibility expectations
7. Scope
   - In scope
   - Out of scope
   - Non-goals
   - Explicit boundaries
8. Users And Use Cases
   - Primary users
   - Secondary users
   - Main use cases
   - Edge use cases
9. Functional Requirements
   - Required behaviors
   - Inputs
   - Outputs
   - State changes
   - Error states
   - Permissions/auth expectations
10. Non-Functional Requirements
   - Performance expectations
   - Reliability expectations
   - Security/privacy expectations
   - Accessibility expectations
   - Maintainability expectations
   - DX expectations
11. Affected Surfaces
   - Files likely affected
   - Directories likely affected
   - UI surfaces
   - API routes
   - Components
   - Services
   - Database/schema
   - Config/env vars
   - Tests
   - Docs
   - Workflow artifacts
12. Dependency And Integration Map
   - Internal dependencies
   - External packages/services
   - Integration points
   - Ordering constraints
   - Migration/setup requirements
13. Data And State Impact
   - Data models
   - Database changes
   - State management changes
   - Cache/session/local storage impact
   - Backward compatibility impact
14. UX / API / Workflow Expectations
   - UX expectations
   - API contract expectations
   - CLI/workflow behavior
   - Error handling expectations
   - Empty/loading/success/failure states
15. Execution Strategy
   - Recommended implementation approach
   - Suggested sequencing
   - Safe rollout/migration approach
   - Files to inspect before editing
   - Decisions to avoid until more evidence exists
16. Verification Strategy
   - Required automated checks
   - Required manual checks
   - Test types needed
   - Build/lint/typecheck expectations
   - Acceptance evidence required
   - Proof of completion
17. Acceptance Criteria
   - [ ] Concrete measurable criterion 1
   - [ ] Concrete measurable criterion 2
   - [ ] Concrete measurable criterion 3
18. Edge Cases And Failure Modes
   - Edge cases
   - Failure modes
   - Regression risks
   - Recovery expectations
19. Risks And Mitigations
   - Technical risks
   - Product/UX risks
   - Security risks
   - Scope risks
   - Mitigation plan
20. Assumptions
   - Explicit assumptions
   - Confidence level
   - What to revisit if assumptions are wrong
21. Open Questions
   - Blocking questions
   - Non-blocking questions
   - Execution impact
22. Task Extraction Notes
   - Suggested vertical task boundaries
   - Suggested first task
   - Suggested task ordering
   - Areas that should not become separate tasks
   - How the 3-pass Build -> Refine -> Polish loop should apply

If the user said skip questions, generate the best possible detailed spec and clearly record assumptions and open questions.

Do not implement code.
```

## Spec Quality Review

```txt
Review the saved _spec/ file before task planning.

Confirm:
1. All 22 required detailed spec sections are present.
2. Irrelevant sections say "Not applicable" instead of being deleted.
3. The spec is based on the active request, intake answers, repo intake, dirty worktree status, handoff/progress context, latest relevant summary, and durable project docs.
4. Current State Analysis explains existing behavior, affected files/modules, data flow, workflow/API/UI behavior when relevant, and known verification coverage.
5. Desired End State, Scope, Functional Requirements, Non-Functional Requirements, Affected Surfaces, Dependency And Integration Map, Data And State Impact, UX/API/Workflow Expectations, Execution Strategy, Verification Strategy, Acceptance Criteria, Edge Cases, Risks, Assumptions, Open Questions, and Task Extraction Notes are specific enough for planning.
6. Acceptance Criteria are checklist-only, concrete, measurable, and verifiable.
7. Task Extraction Notes identify likely vertical task boundaries, suggested first task, ordering, areas not to split out, and how Build -> Refine -> Polish applies.
8. No open question blocks safe planning.

If required sections are missing or too vague, repair the spec before generating _task/.
If planning proceeds with missing required sections, workflow health must be Partial or Failed depending on severity.
```

## Request Classification

```txt
Read WORK_REQUEST.md and the saved _spec/ file.

Classify the request as one primary type:
- feature
- bugfix
- boilerplate
- security
- refactor
- test
- docs
- ops
- research

Also identify:
1. Scope: small, medium, or large.
2. Risk: low, medium, or high.
3. Whether implementation is allowed after the saved spec and task plan.
4. Whether any open question blocks implementation.
5. The safest first vertical task.

Do not edit implementation files.
```

## Repo Intake

```txt
Inspect the repository for the saved spec in _spec/.

Find:
1. Stack and major frameworks.
2. Package manager and lockfiles.
3. Test, lint, build, and typecheck commands.
4. Folder and naming conventions.
5. Existing architecture boundaries.
6. Files likely affected by the request.
7. Risks, missing tooling, and unknowns.

Update docs/PROJECT_CONTEXT.md with durable findings only.
Do not implement the request yet.
```

## Vertical Task Generation

```txt
Using WORK_REQUEST.md, the saved detailed _spec/ file, _progress/progress.md, the latest relevant _summary/ entry, _handoff/current.md, and durable docs, generate a vertical task plan in _task/.

Before writing tasks, extract task boundaries from the detailed spec, especially:
1. Affected Surfaces.
2. Dependency And Integration Map.
3. Data And State Impact.
4. UX / API / Workflow Expectations.
5. Execution Strategy.
6. Verification Strategy.
7. Acceptance Criteria.
8. Edge Cases And Failure Modes.
9. Risks And Mitigations.
10. Assumptions and Open Questions.
11. Task Extraction Notes.

Do not plan from the raw request alone. If the detailed spec is missing required sections or is not complete enough to plan from, repair the spec or stop before task planning.

Each task must include:
- Task ID
- Status
- Objective
- Files likely affected
- Checklist
- Iteration plan for Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish
- Acceptance criteria
- Acceptance result
- Verification commands
- Stop condition
- Out-of-scope items

Each iteration plan must include:
- Goal
- Changes made
- Verification command/result
- Review findings
- Acceptance status
- Remaining issues
- Next action

Tasks must be vertical slices, not vague layers.
Use Ralph Wiggum-style task phrasing: small, literal, concrete, sequential.
Do not split out areas the detailed spec says should not become separate tasks.

Do not implement code.
```

## 3-Pass Task Hardening Loop

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Run the active executable task through the required 3-pass hardening loop:

1. Iteration 1 - Build: implement the smallest working vertical slice, run verification, review against acceptance criteria, and record issues, gaps, failed checks, and the next refinement target.
2. Iteration 2 - Refine: fix issues found in Build, improve correctness, edge cases, tests, structure, naming, typing, reliability, and project consistency, run verification again, review again, and record what improved and what remains.
3. Iteration 3 - Polish: perform final cleanup and hardening, remove rough edges, tighten tests/docs/types/error handling where relevant, confirm no regressions, run final verification, and produce the final task verdict.

For each iteration, record:
- Goal
- Changes made
- Verification command/result
- Review findings
- Acceptance status
- Remaining issues
- Next action

Do not mark the task Done until all three iterations are complete and all required acceptance criteria are checked [x], unless a documented stop condition forces Blocked or Needs Human Review.
```

## Iteration 1 Build Pass

```txt
Run Iteration 1 - Build for the active task.

Goal:
Implement the smallest working vertical slice that satisfies the core task intent.

Required evidence:
- Changes made
- Verification command/result
- Review findings against acceptance criteria
- Acceptance status
- Issues, gaps, or failed checks
- Next refinement target

If verification fails, run the failure recovery protocol inside this iteration and document the result.
```

## Iteration 2 Refine Pass

```txt
Run Iteration 2 - Refine for the active task.

Goal:
Fix issues found in Iteration 1 and improve correctness, edge cases, tests, structure, naming, typing, reliability, and project consistency.

Required evidence:
- Changes made
- Verification command/result
- Review findings
- Acceptance status
- What improved
- What remains
- Next action for Polish

If verification fails, run the failure recovery protocol inside this iteration and document the result.
```

## Iteration 3 Polish Pass

```txt
Run Iteration 3 - Polish for the active task.

Goal:
Complete final cleanup and hardening, remove rough edges, tighten tests/docs/types/error handling where relevant, confirm no regressions, and produce the final task verdict.

Required evidence:
- Changes made
- Final verification command/result
- Final review findings
- Final acceptance status
- Remaining issues, or none
- Final task verdict

Do not mark the task Done unless all required acceptance criteria are checked [x].
```

## Iteration Evidence Review

```txt
Review iteration evidence for the active task.

Confirm:
1. Iteration 1 Build has goal, changes, verification, review findings, acceptance status, remaining issues, and next action.
2. Iteration 2 Refine has goal, changes, verification, review findings, acceptance status, remaining issues, and next action.
3. Iteration 3 Polish has goal, changes, verification, review findings, acceptance status, remaining issues, and final verdict.
4. Failure recovery, if used, is documented inside the iteration where verification failed.
5. Final acceptance criteria are all checked [x], or the task is Blocked/Needs Human Review.

Report missing evidence before the task is marked Done.
```

## Single-Task Execution

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Execute exactly one task through the full 3-pass hardening loop:
<TASK-ID> - <TASK_TITLE>

Before editing:
- Read _progress/progress.md.
- Read the latest relevant _summary/ entry.
- Read the saved _spec/ file.
- Read the saved _task/ plan.
- Check git status.
- Inspect only relevant files.

After editing:
- Complete Iteration 1 Build, Iteration 2 Refine, and Iteration 3 Polish.
- Run or recommend verification commands in each iteration.
- Critique the result in each iteration.
- Fix only in-scope defects.
- Append to _progress/progress.md with task ID, status, files changed, iteration evidence, verification result, blockers, and next step.
- Create or append the relevant _summary/ entry if the workflow stops here.
- Check git status again.

Do not implement any other task.
```

## Parallel Orchestrator Planning

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Execution mode: parallel-workflow.

Act as the orchestrator. Own intake, the detailed spec, and the task plan.

Before assigning workers:
1. Read WORK_REQUEST.md, AGENTS.md, RUN_WORKFLOW.md, _handoff/current.md, _progress/progress.md, the latest relevant _summary/ entry, and durable docs.
2. Save or verify the detailed spec in _spec/.
3. Save or verify the task plan in _task/.
4. Add required metadata to every task: Priority, Parallel safe, Depends on, Blocks, File locks, Claim status, Claimed by, Agent role, Merge risk.
5. Rank P0 before P1 before P2.
6. Mark tasks parallel-safe only when dependencies and file locks do not conflict.
7. Create or update _parallel/claims.md, _parallel/locks.md, and _parallel/agent-status.md.
8. Use default worker agents: 3.
9. Use minimum parallel workers: 2 when 2 or more parallel-safe unblocked tasks exist.
10. Use maximum worker agents: 5.
11. Fall back to 1 worker only when dependency or file-lock safety requires sequential execution.

Do not assign two workers to overlapping file locks.
Update _handoff/current.md with queue, claim, lock, worker, and merge-review status.
```

## Parallel Worker Claim Task

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Execution mode: parallel-worker.

Read AGENTS.md, RUN_WORKFLOW.md, the saved spec, the saved task plan, _parallel/claims.md, _parallel/locks.md, _parallel/agent-status.md, _progress/progress.md, and _handoff/current.md.

Claim exactly one task:
1. Select the highest-priority unclaimed task where Parallel safe is yes and dependencies are unblocked.
2. Prefer P0 before P1 before P2.
3. Among same-priority tasks, pick the lowest dependency risk and lowest merge risk.
4. Confirm the task's file locks do not overlap active locks in _parallel/locks.md.
5. Record Claim status=claimed, Claimed by=<agent-id>, Agent role=parallel-worker, and file locks before editing.
6. Update _parallel/agent-status.md and _handoff/current.md.

If no safe task exists, do not edit files. Record the reason and stop.
```

## Parallel Worker Execute Claimed Task

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Execution mode: parallel-worker.

Execute only the task already claimed by this worker.

Required loop:
1. Mark the claim in-progress.
2. Run Iteration 1 - Build, verify, review, and record evidence.
3. Run Iteration 2 - Refine, verify, review, and record evidence.
4. Run Iteration 3 - Polish, verify, review, and record final verdict.
5. Append _progress/progress.md with claim status, file locks, worker status, iteration evidence, acceptance results, verification, and final task status.
6. Mark the claim done, blocked, or needs-review.
7. Release locks only after final task status is recorded.
8. Stop after this one task.

Do not run global review, release notes, summary, or health check unless acting as the orchestrator.
```

## Parallel Lock Conflict Review

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Review a parallel lock conflict.

Read _parallel/claims.md, _parallel/locks.md, _parallel/agent-status.md, _progress/progress.md, _handoff/current.md, the saved task plan, and the current diff.

Report:
1. Tasks involved.
2. Overlapping file locks.
3. Current claim owners.
4. Whether any edits already overlap.
5. Safest resolution: stop one worker, reassign one task, serialize the tasks, or mark needs-review.

Do not continue parallel execution until no overlapping active file locks remain.
```

## Parallel Merge Review

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Execution mode: parallel-orchestrator.

After workers finish, perform merge review:
1. Read all worker progress entries.
2. Read _parallel/claims.md, _parallel/locks.md, and _parallel/agent-status.md.
3. Confirm every worker task has Build -> Refine -> Polish evidence.
4. Confirm every claimed task is done, blocked, or needs-review.
5. Confirm no overlapping active file locks remain.
6. Run git diff --stat and git diff.
7. Resolve safe in-scope conflicts or create follow-up tasks.
8. Run final verification.
9. Write _review/, _release/, _summary/, update _handoff/current.md, and complete the health check.

Health must be Partial or Failed if claims, locks, worker status, iteration evidence, merge review, or final verification are missing.
```

## Parallel Health Check

```txt
Follow AGENTS.md and RUN_WORKFLOW.md.

Run the parallel workflow health check.

Validate:
1. Every task has Priority, Parallel safe, Depends on, Blocks, File locks, Claim status, Claimed by, Agent role, and Merge risk.
2. _parallel/claims.md exists and reflects all worker tasks.
3. _parallel/locks.md exists and has no overlapping active file locks.
4. _parallel/agent-status.md exists and reflects all active or completed workers.
5. Every worker task has Build -> Refine -> Polish evidence.
6. Claims are done, blocked, or needs-review before locks are released.
7. Orchestrator merge review exists.
8. Final verification ran or was documented.

Return Passed, Partial, or Failed with concrete missing evidence.
```

## Ralph Wiggum Task Execution

```txt
Run the current task like a small literal checklist.

For each checklist item:
1. Say what file or behavior you are checking.
2. Make only the change needed for the current item.
3. Stop if the next action would expand scope.
4. Verify the task acceptance criteria inside the current iteration.
5. Record iteration evidence before moving on.
6. Update _progress/progress.md before moving on.

No bundled refactors.
No second task until this task completes Build -> Refine -> Polish and the iteration evidence is logged.
```

## Critique Loop

```txt
Review the active task result and iteration evidence as a senior engineer.

Use the saved _spec/ file, saved _task/ plan, _progress/progress.md, and the current diff.

Prioritize:
1. Bugs or regressions.
2. Security issues.
3. Missing acceptance criteria.
4. Missing edge cases.
5. Test gaps.
6. Scope creep.
7. Unnecessary complexity.
8. Missing Build, Refine, or Polish evidence.

Return findings with file and line references where possible.
Fix only defects inside the current task scope.
```

## Verification Repair

```txt
Follow AGENTS.md.

The verification for the active task failed during this iteration:
<COMMAND>

Failure summary:
<PASTE_FAILURE_SUMMARY>

Fix only the cause of this active-task failure.
Do not refactor unrelated code.

After the fix:
- Re-run the failing command if possible.
- Run directly related tests.
- Append the result to the current iteration evidence and _progress/progress.md.
- Update the final _summary/ entry if the workflow is complete.
- Summarize the root cause and fix.
```

## Final Summary

```txt
Produce the final workflow summary and create or append it in _summary/.

Include:
1. Original work request.
2. Spec file used.
3. Whether the detailed spec was complete or had gaps, including any missing required sections and whether they were repaired before planning.
4. Task plan used.
5. Tasks completed.
6. Iteration evidence summary.
7. Files changed.
8. Verification commands and results.
9. Unresolved issues or blockers.
10. Recommended next work.
11. Suggested commit message.

Do not claim a commit was made unless one was actually created.
```

## Architecture Review

```txt
Review the saved _spec/ file, docs/PROJECT_CONTEXT.md, and docs/ARCHITECTURE.md for consistency.

Identify:
1. Architecture decisions that are clear.
2. Gaps or contradictions.
3. Over-engineered areas.
4. Missing production concerns.
5. Recommended updates to docs/DECISIONS.md.

Do not implement code.
```

## Reduce Complexity

```txt
Review the implementation of <FEATURE_OR_TASK>.

Goal:
Reduce complexity while preserving behavior.

Constraints:
- Do not change public APIs.
- Do not change user-visible behavior.
- Do not introduce dependencies.
- Keep changes small and reviewable.

First propose the simplification plan.
Wait for approval before editing.
```

## Prepare Commit

```txt
Prepare a commit summary for the completed task <TASK-ID>.

Include:
1. Suggested commit message.
2. Files changed.
3. Behavior changed.
4. Verification run.
5. Known risks or follow-up tasks.

Do not run git commit unless explicitly instructed.
```

## Generate Changelog

```txt
Generate a changelog entry for the changes since <BASE_REF>.

Group by:
- Added
- Changed
- Fixed
- Removed
- Security

Keep it concise and user-facing.
```

## Generate Demo Summary

```txt
Create a short demo summary for <FEATURE_OR_RELEASE>.

Include:
1. What was built.
2. The main user workflow.
3. What to show in a demo.
4. Known limitations.
5. Suggested next improvement.
```
