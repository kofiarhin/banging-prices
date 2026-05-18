# Release Notes

Store release notes for completed workflow runs in this folder.

Agents create one release note after the workflow review and before the final summary:

```txt
_release/<request-id>.md
```

Each release note must include:

- Request.
- User-facing changes.
- Developer changes.
- Iteration evidence summary.
- New routes/APIs.
- New env vars.
- Database/schema changes.
- Dependencies added/removed.
- Test commands run.
- Known limitations.
- Follow-up work.
- Suggested commit message.

If there are no user-facing changes, say so. If there are no new APIs, env vars, dependencies, or schema changes, say `none`.
