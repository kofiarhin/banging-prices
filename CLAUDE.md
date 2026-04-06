# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Banging Prices is a fashion price intelligence platform. It crawls online retailers, normalises product data, tracks price history, and surfaces only verified price drops. The core question it answers: *what products have actually dropped in price right now?*

---

## Commands

All commands run from the project root unless noted.

```bash
# Development (runs server + client concurrently)
npm run dev

# Backend only (nodemon)
npm run server

# Frontend only (Vite)
npm run client

# Production server
npm start

# Run all crawlers
npm run scrapers

# Run a specific crawler
npm run scrapers:nike
npm run scrapers:asos
npm run scrapers:boohoo

# Build frontend
cd client && npm run build

# Lint frontend
cd client && npm run lint
```

Client runs on **http://localhost:4000**, API on **http://localhost:5000**.

---

## Environment Variables

**Root `.env`** (backend):
```
PORT=5000
MONGO_URI=mongodb+srv://...
CLERK_SECRET_KEY=...
CLIENT_URL=http://localhost:4000
```

**`client/.env`** (frontend):
```
VITE_API_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=...
```

---

## Architecture

### Stack Deviations from Global Config

This project uses **SCSS** (not Tailwind). There is **no Redux** — only TanStack Query and React local state. Auth is handled by **Clerk** (`@clerk/clerk-react` on client, `@clerk/express` on server).

### Backend

- **Entry**: `server/server.js` → loads env, connects DB, starts Express via `server/app.js`
- **Routes**: `/api/products`, `/api/auth`, `/api/alerts`, `/api/collections`, `/api/home`
- **Auth middleware**: `clerkMiddleware()` applied globally; individual routes opt into auth protection
- **Crawlers**: individual scrapers live in `server/scrappers/` (note spelling), coordinated by `server/crawlers/storeCrawlers.js`
- **Scraper orchestration**: `storeCrawlers.js` runs all scrapers sequentially, normalises their output to a canonical format, then upserts into MongoDB
- **Canonical key**: the unique product identity across crawls — generated from normalised URL + store via `server/utils/canonical.js`. This is the dedup mechanism; changing it affects all existing records

### Frontend

- **Entry**: `client/src/main.jsx` — wraps app in `ClerkProvider`, `QueryClientProvider`, `BrowserRouter`
- **Routing**: `client/src/App.jsx` — lazy-loaded pages, `<Protected>` wrapper uses Clerk's `<SignedIn>`/`<SignedOut>`
- **Query hooks**: flat in `client/src/hooks/` (e.g. `useHomeQuery.js`, `useSavedProductsQuery.js`) — no subdirectory split
- **API calls**: hooks use `fetch` directly with `import.meta.env.VITE_API_URL`. No centralised Axios client exists yet — keep this pattern unless refactoring is requested
- **Styles**: SCSS files co-located with components or in `client/src/styles/`

### Data Flow

1. Crawlers (Crawlee + Playwright) scrape category pages per retailer
2. Raw data is normalised in `storeCrawlers.js` → `normalize()` → required fields checked → upserted via `canonicalKey`
3. `discountPercent` is calculated server-side only — never trust client-side discount logic
4. API serves paginated, filtered products; supports `search`, `gender`, `category`, `sort`, `page`, `limit`
5. Price alerts are processed via `server/jobs/alerts.job.js` and email sent via `server/controllers/sendEmail.js`

### Deployment

- **Backend**: Heroku — `heroku-postbuild` installs Playwright's Chromium; crawlers run as separate one-off dynos
- **Frontend**: Namecheap via FTP (see workspace-level CLAUDE.md for CI/CD details)
- Do not change deployment targets unless explicitly asked
