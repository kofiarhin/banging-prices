# Parallel File Locks

Use this file to prevent overlapping edits in parallel execution modes.

## Lock Rules

- File locks must be declared before editing.
- No two active workers may hold overlapping file locks.
- If a task needs a locked file owned by another worker, the worker must stop or choose another eligible task.
- If unexpected file overlap appears, the worker must stop, mark the task `needs-review`, and update this file plus `_parallel/claims.md`.
- Locks are released only after the worker records final task status.

## Active Locks

| Path or glob | Locked by | Task ID | Claim status | Acquired | Expected release | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<path>` | `<agent>` | `<TASK-ID>` | `<claimed/in-progress>` | `<timestamp>` | `<timestamp>` | `<notes>` |

## Released Locks

| Path or glob | Released by | Task ID | Final task status | Released | Notes |
| --- | --- | --- | --- | --- | --- |
| `<path>` | `<agent>` | `<TASK-ID>` | `<done/blocked/needs-review>` | `<timestamp>` | `<notes>` |
