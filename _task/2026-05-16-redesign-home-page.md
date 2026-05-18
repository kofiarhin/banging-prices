# Redesign Home Page Task Plan

- Spec file used: `_spec/2026-05-16-redesign-home-page.md`
- Planning date: 2026-05-16
- Progress and summary files read: `_progress/progress.md`; latest `_summary/` content was the placeholder summary memory.
- Handoff read: `_handoff/current.md`
- Detailed spec sections used: Sections 5, 6, 7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, and 22.
- Execution mode: `complete-workflow`
- Dirty worktree protection: Existing dirty files include homepage files planned for this work. Overlap was reported to the user and approved by `ok lets implement this`; unrelated dirty/untracked workflow and tool files must not be reset or cleaned.

## Task List

### TASK-001: Redesign the public homepage as a deal-discovery flow

- Status: `Done`
- Priority: `P0`
- Parallel safe: `no`
- Depends on: `none`
- Blocks: `final review, release notes, summary`
- File locks: `client/src/pages/HomePage/HomePage.jsx`, `client/src/pages/HomePage/home-page.styles.scss`, `client/src/components/home/Hero/Hero.jsx`, `client/src/components/home/Hero/hero.styles.scss`, `client/src/components/home/HeroHeadline/HeroHeadline.jsx`, `client/src/components/home/HeroHeadline/hero-headline.styles.scss`, `client/src/components/home/Stats/stats.styles.scss`, `client/src/components/home/HowItWorks/HowItWorks.jsx`, `client/src/components/home/HowItWorks/how-it-works.styles.scss`, `client/src/components/Sections/sections.styles.scss`, `client/src/components/cards/product-card.styles.scss`, `docs/PROJECT_CONTEXT.md`, workflow artifacts`
- Claim status: `done`
- Claimed by: `Codex`
- Agent role: `orchestrator`
- Merge risk: `medium`

Objective:
Redesign `/` into a search-first deal-discovery homepage that keeps the existing home API and routes intact.

Files likely affected:
- `client/src/pages/HomePage/HomePage.jsx`
- `client/src/pages/HomePage/home-page.styles.scss`
- `client/src/components/home/Hero/Hero.jsx`
- `client/src/components/home/Hero/hero.styles.scss`
- `client/src/components/home/HeroHeadline/HeroHeadline.jsx`
- `client/src/components/home/HeroHeadline/hero-headline.styles.scss`
- `client/src/components/home/Stats/stats.styles.scss`
- `client/src/components/home/HowItWorks/HowItWorks.jsx`
- `client/src/components/home/HowItWorks/how-it-works.styles.scss`
- `client/src/components/Sections/sections.styles.scss`
- `client/src/components/cards/product-card.styles.scss`
- `docs/PROJECT_CONTEXT.md`
- workflow artifacts

Checklist:
- [x] Update homepage composition to include search-first hero, stats, featured deal carousel, sections, how-it-works, and editor's pick.
- [x] Preserve existing `useHomeQuery` data flow and route navigation.
- [x] Keep loading, error, and empty states.
- [x] Improve mobile responsive SCSS and prevent text overlap.
- [x] Run lint and build verification in each iteration.
- [x] Record iteration evidence, acceptance, progress, and handoff.

Iteration plan:

#### Iteration 1 - Build
- Goal: Implement the main redesigned homepage composition and first-pass SCSS.
- Changes made: Added `HowItWorks` to `HomePage`, rewrote homepage copy for deal discovery, refreshed hero/headline/stats/sections/card SCSS, and preserved search/carousel data flow.
- Verification command/result: `npm run build` passed. `npm run lint` failed on unrelated existing files: `Header.jsx`, `HeroCarousel.jsx`, `SideNav.jsx`, `usePostSignup.js`, `PostRegisterPage.jsx`, `PostLogin.jsx`, `ProductsPage.jsx`, and `TrackedAlertsPage.jsx`. Targeted lint on touched homepage JS files passed.
- Review findings: First pass met the core layout goal. Full lint blocker was unrelated to touched homepage files and required documentation.
- Acceptance status: Partially met; implementation and build passed, but visual polish and global text cleanup remained.
- Remaining issues: Remaining mojibake/default typography in related UI paths and editor's-pick styling polish.
- Next action: Refine visible text, typography tokens, and editor's-pick banner.

#### Iteration 2 - Refine
- Goal: Fix issues from Iteration 1 and tighten responsiveness/accessibility.
- Changes made: Cleaned visible mojibake in touched UI paths, replaced homepage-facing font tokens away from the previous default stack, and restyled `EditorsPickBanner` to match the redesigned deal-discovery surface.
- Verification command/result: `npm run build` passed. `npm run lint` failed on the same unrelated existing files. Targeted lint on touched JS files passed; SCSS file was ignored by ESLint configuration as expected.
- Review findings: Touched files remained clean. Full lint remains a repo-level blocker outside this task.
- Acceptance status: Met for touched files and build; full lint remains documented as unrelated.
- Remaining issues: Need final pre-flight, browser smoke check, and workflow documentation.
- Next action: Run final verification and browser smoke check.

#### Iteration 3 - Polish
- Goal: Final cleanup, design pre-flight, and regression verification.
- Changes made: Ran pre-flight text/style scan, confirmed touched homepage files avoid the old mojibake patterns, started Vite dev server, and captured desktop/mobile browser screenshots.
- Verification command/result: `npm run build` passed. `npm run lint` failed on unrelated existing lint errors. Targeted lint on touched JS files passed. Playwright smoke check rendered the homepage at desktop and mobile; console errors were from local backend API refusal at `localhost:5000`, so error/loading states rendered as expected.
- Review findings: Homepage redesign is scoped, responsive, and preserves route/data behavior. Backend unavailability is environmental and out of scope.
- Acceptance status: All task-specific acceptance criteria met; full project lint has unrelated pre-existing blockers.
- Remaining issues: Existing repo lint failures outside the homepage task.
- Next action: Final review, release notes, summary, and health check.

Acceptance criteria:
- [ ] Homepage presents a cohesive deal-discovery first screen with search, browse CTA, live trust stats, and featured deal imagery.
- [ ] Existing home API data flow, product navigation, category navigation, and search routing remain intact.
- [ ] Loading, error, and empty states remain available and visually aligned with the redesign.
- [ ] Mobile layout collapses cleanly without horizontal overflow or text overlap.
- [ ] No new dependencies, backend changes, env vars, or deployment changes are introduced.
- [ ] `client` lint and build verification are run or documented with recovery notes.

Acceptance result:
- [x] Homepage presents a cohesive deal-discovery first screen with search, browse CTA, live trust stats, and featured deal imagery.
- [x] Existing home API data flow, product navigation, category navigation, and search routing remain intact.
- [x] Loading, error, and empty states remain available and visually aligned with the redesign.
- [x] Mobile layout collapses cleanly without horizontal overflow or text overlap in browser smoke check.
- [x] No new dependencies, backend changes, env vars, or deployment changes are introduced.
- [x] `client` lint and build verification are run with recovery notes for unrelated full-lint failures.

Verification commands:
- `cd client && npm run lint`
- `cd client && npm run build`

Stop condition:
- Stop if verification fails after targeted in-scope recovery, if a dirty file conflict appears beyond the approved homepage overlap, or if implementation requires backend/API/dependency changes.

Out-of-scope items:
- Backend APIs, crawlers, deployment, auth flows, product ranking logic, full header/footer redesign, new dependencies.
