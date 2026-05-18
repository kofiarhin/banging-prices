# Summary Memory

Store completed workflow summaries in this folder.

`_summary/` is completed workflow history. `_progress/progress.md` is append-only task history. `_handoff/current.md` is the live resume state for the active workflow.

After implementation and before the final summary, agents must create a review file in `_review/`.

After the review is complete, agents must create release notes in `_release/`, then create or append a summary here. Use timestamped or slugged filenames, for example:

```txt
_summary/2026-05-10-add-dark-theme.md
```

Do not create the final summary until all executable tasks are completed or a stop condition is reached. In default `complete-workflow` mode, the summary must represent the full completed request or documented stop state, not only the first task.

`single-task` remains available only as an explicit optional mode for controlled one-task execution.

Each summary should include:

- Request.
- Spec file used.
- Task plan used.
- Review file used.
- Release notes file used.
- Tasks completed.
- Iteration evidence summary.
- Files changed.
- Acceptance results.
- Verification run.
- Failure recovery notes.
- Final diff audit.
- Workflow health status.
- Final artifact checklist.
- Unresolved issues.
- Next recommended work.

After writing a summary, agents must update `_handoff/current.md` with the summary path, final or current workflow health status, unresolved issues, and suggested next prompt.

Workflow health is `Passed` only when the work request synced, spec exists, task plan exists, progress updated, handoff updated, review created, summary created, release notes created, required iteration evidence exists for every executable task, final diff audit completed or documented, dirty worktree checked, acceptance results completed, verification run or documented, scope respected, and decisions recorded if needed.
