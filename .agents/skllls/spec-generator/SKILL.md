---
name: spec-generator
description: Generate a repo-specific /spec prompt from a short feature request and save it to _spec-prompt.
---

Generate a reusable `/spec` prompt for this repo based on the user's request.

Rules:

- Do not generate the final feature spec.
- Generate only the `/spec ...` prompt that will later generate the spec.
- Save the generated prompt to `_spec-prompt/<feature-name>.md`.
- Create `_spec-prompt/` if it does not exist.
- Keep the prompt repo-aware, implementation-ready, and concrete.

Sample pattern to follow:

/spec Build a login feature for this repo. First audit the existing client and server auth structure, routing, user model, middleware, and any current protected-route or admin patterns. Then generate a repo-specific, implementation-ready feature spec and save it to `_plan/login-feature.md` using `.claude/templates/feature-spec-template.md`.

Scope the feature around standard user login only. Cover:

- login page/form UI
- email/username + password input behavior based on what the repo already supports
- client-side validation
- backend login endpoint and request/response shape
- authentication flow after successful login
- token/session/cookie handling based on current repo patterns
- storing authenticated user state on the frontend
- redirect behavior after login
- protected route access after login
- unauthorized and forbidden behavior
- loading, error, invalid-credentials, missing-fields, expired-session, and duplicate-submit states
- logout implications only if required by the current login flow

Explicitly document:

- current auth structure found in the repo
- whether authorization is based on role, isAdmin, permissions, or mixed patterns
- whether frontend route protection is centralized or scattered
- whether nav/sidebar visibility matches backend authorization
- any under-protected endpoints or auth inconsistencies relevant to login
- migration concerns if auth patterns are mixed

Keep the spec concrete and implementation-ready. Do not invent files or patterns not present in the repo. Include File Impact split into:

- Files Confirmed To Exist
- Files To Create
- Files To Update

Non-goals unless already present in the repo:

- signup
- forgot password
- social auth
- MFA
- full auth refactor
