# Release Notes: Codebase Bug Audit And Fix

- Request: `audit codebase for potential bugs and fix them`

## User-Facing Changes

- No intentional visual UI changes.
- Product, saved-items, tracked-alerts, auth sync, home nav, collection share, and store insights API calls now use the shared frontend API helper.

## Developer Changes

- Fixed client lint blockers.
- Added `client/src/lib/api.js` as the shared frontend API helper.
- Removed hard-coded localhost API fallbacks from audited frontend call sites.
- Fixed the mis-cased `VITE_api_URL` product-details request.
- Added backend and frontend env example files.
- Added explicit backend `MONGO_URI` fail-fast validation.

## New Routes/APIs

none

## New Env Vars

none. Existing env vars are now documented in `.env.example` and `client/.env.example`.

## Database/Schema Changes

none

## Dependencies Added/Removed

none

## Test Commands Run

- `cd client && npm run lint` - passed.
- `cd client && npm run build` - passed.
- `node --check server/config/db.js` - passed.
- Missing-`MONGO_URI` smoke command - exited with expected clear message.
- Static scans for hard-coded client API URL issues and env placeholder safety - passed.

## Known Limitations

- No automated unit/integration test scripts are configured for client or server.
- Backend integration was not run against a database.

## Follow-Up Work

- Add tests for the API helper and critical query/mutation hooks.
- Add backend Supertest coverage and scripts.
- Move page-level API functions into service modules over time.

## Suggested Commit Message

`fix: clean up lint and centralize api configuration`
