# Legacy Verification Notes

The main workflow now records per-task verification in `_progress/progress.md` and final workflow verification in `_summary/`.

Use this file only for compatibility or durable verification guidance. Do not treat it as the authoritative progress log.

## Verification Rules

- Record commands exactly as run.
- Do not mark verification as passed unless it actually passed.
- If a command cannot run, record why.
- Include manual checks when automated tests are unavailable.
- Record bugs found during verification and fixes applied.
- Link verification to the task ID in `_task/`.

## Progress Entry Location

After each task, append verification results to:

```txt
_progress/progress.md
```

Required fields:

- Task ID.
- Status.
- Files changed.
- Verification result.
- Blockers.
- Next step.

## Summary Location

After the workflow completes, include verification results in:

```txt
_summary/<date-or-slug>.md
```
