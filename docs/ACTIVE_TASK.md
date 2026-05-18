# Legacy Active Task Notes

The main workflow now uses saved task plans in `_task/` and append-only progress in `_progress/progress.md`.

Use this file only for compatibility with older agents that expect `docs/ACTIVE_TASK.md`. If used, it must mirror the current task from `_task/` and must not replace `_progress/progress.md`.

## Current Task Mirror

- Task ID: `<TASK-ID>`
- Title: `<Task title>`
- Source task plan: `_task/<filename>.md`
- Source spec: `_spec/<filename>.md`
- Status: `<Not started / In progress / Blocked / Needs review / Done>`
- Started: `<YYYY-MM-DD>`
- Updated: `<YYYY-MM-DD>`

## Scope

In scope:

- `<Behavior or file area>`

Out of scope:

- `<Behavior or file area>`

## Verification

```bash
<command>
```

Result:

- `<Passed / Failed / Not run and why>`

## Progress Log Requirement

After this task, append the authoritative progress entry to:

```txt
_progress/progress.md
```
