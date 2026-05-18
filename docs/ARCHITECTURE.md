# Architecture Plan

This file stores durable architecture context. Active request specs live in `_spec/`, active task plans live in `_task/`, progress lives in `_progress/progress.md`, and final summaries live in `_summary/`.

Users may edit this file manually. Agents should update it only when a request reveals durable architecture facts or decisions that apply beyond one task.

Project: `<PROJECT_NAME>`

Last updated: `<YYYY-MM-DD>`

## System Overview

`<Describe the application shape, major users, major systems, and data flow.>`

## Active Request Architecture Impact

- Source: `<latest direct prompt or WORK_REQUEST.md>`
- Request: `<Plain-English active request>`
- Affected areas: `<Frontend / backend / database / tests / docs / ops / unknown>`
- Expected architecture change: `<None / minor / significant, with reason>`

## Folder Structure

Default MERN layout:

```txt
client/
  src/
    components/
    hooks/
      queries/
      mutations/
    lib/
    pages/
    redux/
    routes/
    services/
    styles/
    utils/
  test/

server/
  config/
  controllers/
  middleware/
  models/
  routes/
  tests/
  utils/

docs/
  ARCHITECTURE.md
  VERIFY.md
  DECISIONS.md

_spec/
  <date-or-slug>.md
_task/
  <date-or-slug>.md
_progress/
  progress.md
_summary/
  <date-or-slug>.md
```

Adapt this structure for other stacks, but keep clear boundaries between UI, API access, business logic, persistence, tests, and documentation.

## Frontend Architecture

- Framework: `<React/Vite by default>`
- Styling: `<Tailwind CSS by default>`
- Routing: `<React Router or project equivalent>`
- Forms: `<Approach>`
- Client state: `<Redux Toolkit or project equivalent>`
- Server state: `<TanStack Query or project equivalent>`
- API client: `<Shared client path, e.g. client/src/lib/api.js>`
- Error handling: `<User-facing and logging approach>`
- Accessibility: `<Keyboard, labels, focus, contrast requirements>`

Frontend rules:

- Keep components focused on UI.
- Keep API calls in services or hooks.
- Do not hard-code backend URLs in components.
- Do not duplicate server state into global client state.
- Keep feature-specific logic close to the feature until reuse is proven.

## Backend Architecture

- Runtime: `<Node.js>`
- Framework: `<Express>`
- Database: `<MongoDB with Mongoose>`
- Authentication: `<Session/JWT/provider>`
- Authorization: `<Roles/permissions/resource ownership>`
- Validation: `<Validation approach>`
- Error handling: `<Central error middleware / response format>`
- Logging: `<Logging approach>`

Backend rules:

- Keep routes thin.
- Put request validation at API boundaries.
- Keep sensitive fields out of API responses.
- Centralize error handling.
- Keep database access explicit and testable.

## State Management

Client state:

- Use for UI preferences, local workflow state, auth session metadata, and cross-screen client-only state.

Server state:

- Use query/mutation hooks for data fetched from the backend.
- Cache and invalidate server data through the server-state library.

Do not copy server records into global client state unless there is a documented reason.

## API Strategy

- API style: `<REST/GraphQL/RPC>`
- Base path: `<e.g. /api>`
- Versioning: `<None/v1/header-based/etc.>`
- Auth transport: `<Cookie/Bearer token/etc.>`
- Error shape:

  ```json
  {
    "error": {
      "code": "<ERROR_CODE>",
      "message": "<Human-readable message>"
    }
  }
  ```

API guidelines:

- Use consistent status codes.
- Validate request bodies and params.
- Return only data the client needs.
- Avoid leaking implementation details in errors.
- Document contract changes in `docs/DECISIONS.md` when significant.

## Testing Strategy

Frontend:

- Unit and component tests for reusable logic and UI states.
- Integration tests for key workflows.
- Build validation before release.

Backend:

- Unit tests for pure utilities and business rules.
- Supertest integration tests for API behavior.
- Database tests should use an isolated test database or in-memory equivalent.

End-to-end:

- Add only for critical user journeys.
- Keep stable and high-value.

## Deployment Strategy

- Frontend: `<Hosting target>`
- Backend: `<Hosting target>`
- Database: `<Hosting target>`
- CI/CD: `<Pipeline>`
- Environment variables:
  - `<VARIABLE>`: `<Purpose>`

Release expectations:

- Build passes.
- Tests pass or known failures are documented.
- Required environment variables are documented.
- Rollback path is known.

## Scaling Considerations

Near-term:

- `<Expected traffic and data volume>`
- `<Likely bottlenecks>`

Future:

- Caching strategy.
- Background jobs.
- Rate limiting.
- Database indexing.
- Observability.
- Horizontal scaling.
- Data retention and archival.

## Open Architecture Questions

- `<Question>`
- `<Question>`
- `<Question>`
