# Release Notes: Redesign Home Page

- Request: `redesign home page`

## User-Facing Changes

- Redesigned the public homepage into a deal-discovery flow.
- Added stronger hero messaging around verified price drops.
- Kept primary browse/search paths prominent.
- Added a concise "How it works" trust section.
- Restyled featured deal, stats, product strips, product cards, empty/error/loading surfaces, and editor's-pick banner.
- Improved responsive behavior for mobile and desktop.

## Developer Changes

- Updated existing React/SCSS homepage components.
- Kept `useHomeQuery` and existing route/query behavior intact.
- Updated frontend font tokens in `client/src/main.styles.scss`.
- Added workflow spec, task plan, progress, review, release, and summary artifacts.

## New Routes/APIs

none

## New Env Vars

none

## Database/Schema Changes

none

## Dependencies Added/Removed

none

## Test Commands Run

- `cd client && npm run build` - passed.
- `cd client && npm run lint` - failed due to unrelated existing lint errors outside touched homepage files.
- `cd client && npx eslint <touched homepage JS files>` - passed.
- Playwright browser smoke check against `http://127.0.0.1:5173` - rendered desktop and mobile homepage; backend API unavailable locally, so error/loading states were shown.

## Known Limitations

- Full client lint remains blocked by pre-existing unrelated errors.
- Local browser smoke check did not show populated home API data because the backend was not running on `localhost:5000`.

## Follow-Up Work

- Fix repo-level lint errors.
- Smoke test homepage with backend data running.

## Suggested Commit Message

`feat: redesign homepage deal discovery experience`
