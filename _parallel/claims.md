# Parallel Claims

Use this file to coordinate task claims in `parallel-workflow` and `parallel-worker` modes.

## Claim Rules

- P0 tasks are claimed before P1 tasks; P1 tasks are claimed before P2 tasks.
- Among same-priority tasks, claim the task with the lowest dependency risk and lowest merge risk first.
- A worker can claim exactly one task at a time.
- Claim status values: `unclaimed`, `claimed`, `in-progress`, `done`, `blocked`, `needs-review`.
- A worker must record the claim before editing.
- A worker must record final status before releasing locks.

## Claim Table

| Task ID | Priority | Parallel safe | Depends on | Blocks | File locks | Claim status | Claimed by | Agent role | Merge risk | Started | Finished | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<TASK-ID>` | `<P0/P1/P2>` | `<yes/no>` | `<task ids or none>` | `<task ids or none>` | `<paths>` | `unclaimed` | `none` | `<orchestrator/worker>` | `<low/medium/high>` | `<timestamp>` | `<timestamp>` | `<notes>` |

## Claim History

- `<YYYY-MM-DD HH:MM>`: `<agent>` `<claimed/released/completed/blocked/needs-review>` `<TASK-ID>` with locks `<paths>`.
