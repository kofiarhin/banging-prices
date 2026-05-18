# Parallel Agent Status

Use this file to track orchestrator and worker status in parallel execution modes.

## Agent Pool Rules

- Recommended/default worker count: 3.
- Minimum parallel workers: 2 when 2 or more parallel-safe unblocked tasks exist.
- Maximum worker agents: 5.
- Use fewer workers when tasks conflict, share files, or depend on each other.
- Use 1 worker only when dependency or file-lock safety requires sequential execution.

## Status Table

| Agent | Role | Current task | Claim status | File locks | Iteration | Verification | Final status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `orchestrator` | `parallel-orchestrator` | `<task or merge review>` | `<status>` | `<paths or none>` | `<iteration or none>` | `<not run/passed/failed/partial>` | `<active/done/blocked/needs-review>` | `<notes>` |
| `<worker-id>` | `parallel-worker` | `<TASK-ID>` | `<claimed/in-progress/done/blocked/needs-review>` | `<paths>` | `<Build/Refine/Polish>` | `<not run/passed/failed/partial>` | `<active/done/blocked/needs-review>` | `<notes>` |

## Merge Review Status

- Claims reviewed: `<yes/no>`
- Locks reviewed: `<yes/no>`
- Worker outputs reviewed: `<yes/no>`
- Overlapping active file locks: `<none or details>`
- Build -> Refine -> Polish evidence complete for worker tasks: `<yes/no>`
- Final verification: `<not run/passed/failed/partial>`
- Merge review verdict: `<pending/passed/needs-review/failed>`
