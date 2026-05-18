# Redesign Home Page Spec

## 1. Metadata
- Spec filename: `_spec/2026-05-16-redesign-home-page.md`
- Date: 2026-05-16
- Request ID / slug: `redesign-home-page`
- Request source: Direct user prompt, synced to `WORK_REQUEST.md`
- Execution mode: `complete-workflow`
- Request classification: `feature`
- Scope level: `medium`
- Risk level: `medium`

## 2. Original Request
- Raw user request: `redesign home page`
- Normalized request: Redesign the home page into a deal-discovery experience that emphasizes verified price drops, product search, live deal data, and trust.
- Source prompt / WORK_REQUEST reference: `WORK_REQUEST.md`

## 3. Questions And Answers
- Questions asked: Asked what the homepage should optimize for, style direction, retained elements, navigation/footer scope, required sections, and whether API behavior should remain unchanged. The user then asked for a recommendation.
- Answers received: Recommended a deal-discovery homepage with search-first hero, live featured deal carousel, trust metrics, product sections, and concise explanation. User approved with `ok lets implement this`.
- Questions skipped: Exact brand copy, visual reference URLs, and product merchandising priorities.
- Remaining open questions: None blocking. Copy and layout details can be selected conservatively based on existing app behavior.

## 4. Problem Definition
- Problem being solved: The homepage needs stronger product discovery and clearer value around verified price drops.
- Why it matters: First-time and returning users need to understand the product quickly and move into browsing/searching deals.
- Current pain point: The current home experience already has pieces of the intended design, but it reads as split hero content plus carousel rather than one cohesive deal-discovery surface.
- Expected value: A sharper first screen with immediate search, live deal evidence, featured product imagery, trust stats, and clear paths to browse products.

## 5. Current State Analysis
- Existing behavior: `HomePage.jsx` loads home data via `useHomeQuery`, derives hero slides and ticker categories, renders `HeroHeadline`, `Hero`, `Sections`, and `EditorsPickBanner`.
- Existing architecture/components: React 19, Vite, React Router, TanStack Query. Styling uses SCSS. Homepage code lives under `client/src/pages/HomePage` and `client/src/components/home`.
- Existing files/modules likely involved: `HomePage.jsx`, `home-page.styles.scss`, `Hero.jsx`, `hero.styles.scss`, `HeroHeadline.jsx`, `hero-headline.styles.scss`, `Stats.jsx`, `stats.styles.scss`, `HowItWorks.jsx`, `how-it-works.styles.scss`, `EditorsPickBanner.jsx`, `editors-pick-banner.styles.scss`, `Sections.jsx`, `sections.styles.scss`, `ProductCard.jsx`, `product-card.styles.scss`, `main.styles.scss`.
- Existing data flow: `useHomeQuery` fetches `/api/home`; homepage uses `data.system`, `data.sections`, `data.heroCarousel` or `data.carousel`.
- Existing API/UI/CLI/workflow behavior: Homepage search navigates to `/products?search=<term>&page=1`; product cards link to `/products/:id`; category links use query strings.
- Existing tests or verification coverage: No dedicated frontend test script in `client/package.json`; available checks are `npm run lint` and `npm run build` from `client/`.

## 6. Desired End State
- Expected final behavior: The homepage opens with a cohesive deal-discovery hero, usable search, live stats, featured deal carousel, category ticker, product strips, editor's pick, and a concise "how it works" section.
- User-facing outcome: Users immediately see what BangingPrices does, can search, browse biggest drops, view featured deals, and trust that discounts are verified.
- Developer-facing outcome: Existing data fetching and routing remain intact; changes stay in existing React/SCSS modules.
- System/workflow outcome: Required workflow artifacts, progress, review, release notes, summary, and handoff are updated.
- Backward compatibility expectations: No backend, API contract, auth, or deployment behavior changes.

## 7. Scope
- In scope: Homepage UI layout, homepage copy, hero/featured deal presentation, empty/loading/error state styling, mobile responsiveness, existing SCSS polish, using existing components and data.
- Out of scope: Backend routes, crawler logic, deployment setup, authentication flows, product filtering behavior, new packages, full design system migration.
- Non-goals: Creating a generic marketing landing page, introducing Tailwind into this SCSS feature, changing product data models.
- Explicit boundaries: Use existing API data and routes; do not add paid or external services; no new dependency unless a blocking need appears.

## 8. Users And Use Cases
- Primary users: Shoppers looking for real discounts and returning users checking latest price drops.
- Secondary users: Authenticated users who may later save or track products.
- Main use cases: Search a product, browse biggest drops, inspect featured category, understand how drops are verified.
- Edge use cases: Home data loading, home feed failing, no slides returned, no sections returned, narrow mobile viewport.

## 9. Functional Requirements
- Required behaviors: Keep search submission working; keep featured slides navigable; keep loading/error/empty states; keep product sections rendering from API data; add/restore homepage explanation section.
- Inputs: API home payload, user search text, carousel controls.
- Outputs: Rendered homepage, navigation to products/category/detail routes.
- State changes: Local UI state only for search text and carousel index/pause state.
- Error states: Inline home feed error with retry/browse fallback.
- Permissions/auth expectations: Homepage remains public.

## 10. Non-Functional Requirements
- Performance expectations: Use CSS transforms/opacity for motion; no heavy animation libraries; lazy product images remain lazy.
- Reliability expectations: Guard against missing slide/product fields.
- Security/privacy expectations: Do not expose sensitive user data; no secrets or hard-coded credentials.
- Accessibility expectations: Semantic sections, labels for search and carousel controls, readable contrast, keyboard-friendly links/buttons, reduced-motion support.
- Maintainability expectations: Stay close to current component boundaries and naming.
- DX expectations: No new install step; use existing `client` scripts.

## 11. Affected Surfaces
- Files likely affected: `client/src/pages/HomePage/HomePage.jsx`, `client/src/pages/HomePage/home-page.styles.scss`, `client/src/components/home/Hero/Hero.jsx`, `client/src/components/home/Hero/hero.styles.scss`, `client/src/components/home/HeroHeadline/HeroHeadline.jsx`, `client/src/components/home/HeroHeadline/hero-headline.styles.scss`, `client/src/components/home/Stats/stats.styles.scss`, `client/src/components/home/HowItWorks/HowItWorks.jsx`, `client/src/components/home/HowItWorks/how-it-works.styles.scss`, `client/src/components/Sections/sections.styles.scss`, `client/src/components/cards/product-card.styles.scss`, workflow artifacts.
- Directories likely affected: `client/src/pages/HomePage`, `client/src/components/home`, `client/src/components/Sections`, `client/src/components/cards`, workflow directories.
- UI surfaces: Public homepage at `/`.
- API routes: None.
- Components: Homepage, hero headline, hero carousel, stats, how-it-works, sections, product card, editor's pick styling if needed.
- Services: None.
- Database/schema: None.
- Config/env vars: None.
- Tests: No test files expected unless validation reveals a targeted need.
- Docs: `docs/PROJECT_CONTEXT.md` may be updated with durable repo facts.
- Workflow artifacts: `WORK_REQUEST.md`, `_spec`, `_task`, `_progress`, `_handoff`, `_review`, `_release`, `_summary`.

## 12. Dependency And Integration Map
- Internal dependencies: `HomePage` depends on `useHomeQuery`, `HeroHeadline`, `Hero`, `Stats`, `Sections`, `ProductCard`, `EditorsPickBanner`.
- External packages/services: Existing React, React Router, TanStack Query, Clerk. No new dependencies.
- Integration points: `/api/home` payload, `/products` query navigation, `/products/:id` links.
- Ordering constraints: Save spec and task plan before code edits; update progress and handoff after task completion.
- Migration/setup requirements: None.

## 13. Data And State Impact
- Data models: None.
- Database changes: None.
- State management changes: None.
- Cache/session/local storage impact: None.
- Backward compatibility impact: Existing API payload shape remains supported with guards.

## 14. UX / API / Workflow Expectations
- UX expectations: Asymmetric, product-led, search-first homepage; dark charcoal base with restrained gold accent; no generic three-card feature row; responsive single-column mobile layout; visible hint of product sections below the hero.
- API contract expectations: No API changes.
- CLI/workflow behavior: Use `client` build/lint for verification.
- Error handling expectations: Show understandable feed error and keep a route to browse products.
- Empty/loading/success/failure states: Preserve loading skeletons, error state, empty state, and successful carousel/sections.

## 15. Execution Strategy
- Recommended implementation approach: Keep the existing component architecture and restyle/recompose the homepage as a deal-discovery flow; add the existing `HowItWorks` component into the home page; improve copy and responsive SCSS; preserve search and carousel logic.
- Suggested sequencing: Update homepage composition/copy, refine hero/headline styles, refine sections/cards/how-it-works styles, run lint/build, polish.
- Safe rollout/migration approach: Frontend-only SCSS/JSX edits with no API or dependency changes.
- Files to inspect before editing: Already inspected homepage, hero, headline, stats, sections, product card, header, global styles, package scripts.
- Decisions to avoid until more evidence exists: Changing backend API, product ranking logic, deployment, or adding animation/icon libraries.

## 16. Verification Strategy
- Required automated checks: `cd client && npm run lint`; `cd client && npm run build`.
- Required manual checks: Inspect rendered homepage if feasible via Vite/browser after build; otherwise rely on static review and build output.
- Test types needed: Existing scripts only; no unit test framework script is present.
- Build/lint/typecheck expectations: Lint and build should pass or any unrelated failures must be documented.
- Acceptance evidence required: Saved task iteration evidence, passing verification or documented failure recovery, final diff audit.
- Proof of completion: Homepage code updated, checks run, workflow artifacts complete.

## 17. Acceptance Criteria
- [ ] Homepage presents a cohesive deal-discovery first screen with search, browse CTA, live trust stats, and featured deal imagery.
- [ ] Existing home API data flow, product navigation, category navigation, and search routing remain intact.
- [ ] Loading, error, and empty states remain available and visually aligned with the redesign.
- [ ] Mobile layout collapses cleanly without horizontal overflow or text overlap.
- [ ] No new dependencies, backend changes, env vars, or deployment changes are introduced.
- [ ] `client` lint and build verification are run or documented with recovery notes.
- [ ] Workflow artifacts are updated through review, release notes, summary, handoff, and health check.

## 18. Edge Cases And Failure Modes
- Edge cases: Missing images, empty slide arrays, missing category labels, zero stats, very long product names, mobile search layout.
- Failure modes: Build/lint failures from JSX syntax, CSS overflow, broken carousel scroll, broken query route.
- Regression risks: Editing already-dirty homepage files could unintentionally remove user changes; mitigated by building on current file contents with user approval.
- Recovery expectations: If verification fails, fix in-scope syntax/style issues and rerun the exact command.

## 19. Risks And Mitigations
- Technical risks: Existing dirty homepage files overlap with planned edits. Mitigation: User approved implementation after overlap was reported; do not reset or discard unrelated files.
- Product/UX risks: Too much marketing copy could reduce deal discovery. Mitigation: Prioritize search, live stats, products, and concise trust explanation.
- Security risks: None expected; no sensitive data or backend changes.
- Scope risks: Header currently hard-codes a fallback API URL, but header is out of scope. Mitigation: Do not modify unrelated API client behavior in this homepage task.
- Mitigation plan: Keep changes scoped, verify build/lint, document gaps.

## 20. Assumptions
- Explicit assumptions: The user wants the recommended deal-discovery direction; homepage API shape should remain unchanged; existing SCSS styling system should be used; current dirty homepage edits can be modified.
- Confidence level: High.
- What to revisit if assumptions are wrong: Brand voice, exact merchandising sections, whether header/footer should be redesigned next.

## 21. Open Questions
- Blocking questions: None.
- Non-blocking questions: Future brand references and final copy preferences.
- Execution impact: No impact on this implementation.

## 22. Task Extraction Notes
- Suggested vertical task boundaries: One vertical task is sufficient because the request is a cohesive homepage redesign touching tightly coupled homepage components.
- Suggested first task: `TASK-001: Redesign the public homepage as a deal-discovery flow`.
- Suggested task ordering: Complete TASK-001, then final review/release/summary.
- Areas that should not become separate tasks: Backend API, auth, deployment, global product search behavior.
- How the 3-pass Build -> Refine -> Polish loop should apply: Build the redesign, refine verification and responsiveness issues, polish design/accessibility and final checks.
