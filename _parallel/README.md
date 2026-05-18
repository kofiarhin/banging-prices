# Parallel Workflow Memory

This folder stores coordination files for parallel multi-agent workflow execution.

Use it only when execution mode is `parallel-workflow`, `parallel-worker`, or `parallel-orchestrator`.

Sequential `complete-workflow` remains the fallback when dependency safety, file-lock safety, or merge risk makes parallel execution unsafe.

## Files

- `claims.md`: task claim queue and final claim status.
- `locks.md`: declared file locks and lock release history.
- `agent-status.md`: orchestrator and worker status board.

## Worker Count Rules

- Default worker count: 3 worker agents.
- Minimum parallel workers: use at least 2 workers when 2 or more parallel-safe unblocked tasks exist with non-overlapping file locks.
- Maximum worker agents: 5.
- Fallback worker count: 1 only when dependency or file-lock safety requires sequential execution.

## Safety Rules

- Intake, detailed spec, and task plan are orchestrator-owned.
- Every task must include priority, parallel-safe flag, dependencies, file locks, claim status, claimed by, agent role, and merge risk.
- Workers claim exactly one task at a time.
- No two workers may claim tasks with overlapping file locks.
- File locks must be declared before editing.
- Locks are released only after the worker records final task status.
- The orchestrator must perform merge review before final review, release notes, summary, and health check.
