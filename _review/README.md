# Workflow Reviews

Agents write one review file in this folder after implementation and before the final summary.

Use timestamped or slugged filenames:

```txt
_review/2026-05-11-add-dark-theme.md
```

## Required Review Sections

Each review file must include:

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

## Review Rules

- Write the review after task verification and before the final summary.
- Review the completed work against the saved spec and task plan.
- Confirm every executable task has Build, Refine, and Polish evidence before it is marked `Done`.
- Check that scope stayed inside the active request.
- Include the final diff audit from `git diff --stat` and `git diff`, or document why those commands could not run.
- Include failure recovery notes for any failed verification, including the failing command, captured error, classification, targeted fix attempt, exact rerun result, and final status.
- Record missing tests even when they are acceptable for the task.
- Use the review verdict to decide whether the workflow can proceed to summary, must fix in-scope defects, or needs human review.
