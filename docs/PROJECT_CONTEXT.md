# Project Context

This file captures durable repository facts discovered during workflow runs. Keep it concise and update it when repo conventions become clear.

## Project Summary

- Project name: `<PROJECT_NAME>`
- Purpose: `<ONE_SENTENCE_PURPOSE>`
- Current maturity: `<prototype / MVP / production / unknown>`

## Stack

- Frontend: `React 19 with Vite`
- Backend: `Node.js / Express`
- Database: `<Database or none>`
- Runtime: `Node.js 20.x`
- Languages: `JavaScript, JSX, SCSS`
- Styling: `SCSS in the current frontend implementation`
- Deployment: `<Platform(s)>`

## Package Manager

- Detected package manager: `npm`
- Lockfiles: `package-lock.json`
- Install command: `npm install`

## Common Commands

```bash
# Test
No client test script currently detected in client/package.json.

# Lint
cd client && npm run lint

# Build
cd client && npm run build

# Typecheck
No separate typecheck script currently detected.
```

## Testing Tools

- Unit tests: `No client unit test script currently detected`
- Integration tests: `<Tool>`
- End-to-end tests: `<Tool>`
- Manual verification notes: `Use Vite build/lint and browser inspection for frontend UI changes when no test script exists.`

## Repo Conventions

- Folder conventions: `Frontend pages live under client/src/pages; reusable components live under client/src/components. Existing home components live under client/src/components/home.`
- Naming conventions: `<Notes>`
- API conventions: `Frontend API requests should use the shared helper in client/src/lib/api.js, which composes paths from VITE_API_URL. Existing homepage data is fetched by client/src/hooks/useHomeQuery.js from /api/home.`
- State management conventions: `TanStack Query is used for home server state; local React state is used for homepage search/carousel UI.`
- Error handling conventions: `<Notes>`

## Architecture Rules

- `<Rule discovered from repo or agreed by team>`
- `<Rule discovered from repo or agreed by team>`

## Known Constraints

- `<Constraint>`
- `<Constraint>`

## Open Questions

- `<Question>`
