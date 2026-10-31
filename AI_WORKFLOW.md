# AI workflow

## 2026-10-31 — Linux Docker startup validation

- Tools: OpenAI Codex desktop, terminal/apply_patch, Vitest, TypeScript and SSH.
- Scope requested by user: prepare Docker files locally, upload source to an
  existing Linux server and verify one-command build/start; no public deployment.
- Added a Node.js 22 multi-stage standalone image, non-root runtime, healthcheck,
  loopback-only Compose port and context exclusions for books and environment files.
- Added Docker configuration coverage and a repeatable Linux smoke script that
  checks readiness, runtime user, HTTP response and referenced static assets.
- Validation: 6 Vitest tests and TypeScript checking passed locally. On Ubuntu
  22.04 x86_64 (Docker 29.5.3, Compose v5.1.4), a fresh image build and startup
  passed, followed by Compose down and a second one-command build/start using
  the build cache. Both smoke runs passed: non-root UID, HTTP 200 and 9 static
  assets returning 200. Host loopback HTTP also returned 200; container was healthy.
- First Linux build took approximately 190 seconds, including dependency/image
  downloads. Total interactive work approximately 8 minutes (estimate).
- Validation directory: /root/epub-reader-docker-734dee3. Stopped and removed the
  test container/network after verification; kept source and image for reruns.
  Existing containers were untouched. No public deployment or browser acceptance
  was performed in this Docker validation.
- Initial Linux execution exposed Windows CRLF in the archived shell script.
  Added explicit LF Git attributes and a regression check before retrying.

## 2026-10-31 — Acceptance with two user-supplied EPUBs

- User waived the sample EPUB and deferred Docker. No product behavior changed.
- Existing browser inspection via computer-use was stopped by the tool because it
  could not confidently determine the Windows browser URL. No further native UI
  actions were taken; existing user browser data was not accessed or altered.
- Added a repeatable, isolated two-real-book Playwright acceptance using local
  Alice and Wizard of Oz files, covering imports/covers, chapter jumps, wheel,
  independent CFI, typography, palette, refresh and return to shelf.
- Existing isolated regression tests cover temporary fixture deletion/corruption,
  legacy repair and narrow viewports; no standalone sample artifact was created.
- Results: 5 component tests, all 8 browser tests, production build and TypeScript
  passed. Real-book test also reran with progress-generation wait before screenshots.
  Reader/shelf screenshots inspected locally; limitations recorded in ACCEPTANCE.md.
- Duration: approximately 8 minutes (estimate, no precise timer).
- Local commit follows AGENTS.md; no push.

The user subsequently authorized combining the three UI revision rounds below into
one local commit. Prior no-commit notes describe the instructions during development;
no push is authorized. Final verification: 5 component tests, 7 browser tests,
TypeScript and production build passed.

## 2026-10-31 — Shelf progress placement and five-color palettes

- Moved the progress element directly after the cover, above the book caption.
- Reduced accents to five and reading backgrounds to five, removing follow-theme.
  Legacy auto preferences resolve to a fixed white/night background and remain
  independent of later interface mode changes.
- Added component checks for option counts, removed option and legacy fallback;
  browser assertions compare cover, progress-bar and caption bounding boxes.
- Validation: 5 component tests, 7 browser tests, production build and TypeScript
  checking passed. Screenshot confirmed the bar sits between cover and caption.
- Duration: approximately 5 minutes (estimate, not a precise timer).
- No commit or push, per the user's standing instruction.

## 2026-10-31 — Wheel, caption, cover and color refinements

- Interpreted user typos as wheel page-turn support and truncating shelf titles.
- Added non-passive wheel listeners both on the host and within epub.js iframe
  documents, with a threshold, gesture cooldown and first/last-page guards.
- Standardized shelf captions to two lines/fixed height with full-title tooltips;
  limited placeholder cover title length too.
- Diagnosed missing Alice cover: legacy migration stored raw bytes/name but never
  extracted cover metadata. Added one-time metadata/cover repair from the stored
  EPUB, retaining the same SHA-256 identity and reading progress.
- Added independent saved interface mode, six accents and six reading backgrounds.
  Text/link colors follow the reading background for legibility.
- Browser tests cover wheel in the iframe, independent color persistence, repaired
  legacy Alice cover, caption height and existing library/reader flows. The repaired
  Alice screenshot was inspected locally.
- Duration: approximately 10 minutes (estimate, no precise start timer recorded).
- Final verification: 4 component tests, 7 browser tests, production build and
  TypeScript passed. The wheel test also passed using native mouse wheel events.
- No commit or push, following the user's standing instruction for these revisions.

## 2026-10-31 — Requested bookshelf and paginated UI revision

- User explicitly expanded the original single-book/no-bookshelf scope, requested
  the entire revision together, and instructed no commit or push until later.
- Tools: OpenAI Codex desktop, terminal/apply_patch, frontend-design guidance,
  Vitest and Playwright/Edge; local screenshots inspected for visual QA.
- Used the supplied images as layout references. Built a dark function rail,
  collapsible panels, tab strip, bookshelf covers/progress and multi-selection.
- Migrated the old IndexedDB current book to SHA-256 keyed shelf records. Import
  metadata/covers locally, deduplicate bytes, persist tabs and independent progress,
  and delete books transactionally before updating the interface.
- Switched epub.js from continuous scrolling to paginated default manager. Added
  single/double view, local font families and line-height settings. Chapter page
  counts come from rendition; whole-book percentages use generated text locations.
- Kept script sandboxing. Added ResizeObserver handling and asynchronous disposal
  after epub.js navigation/location jobs finish. Tests caught premature disposal,
  transient layout resizing and incorrect test selection of another book's key.
- Preserve the original CFI anchor through repagination until intentional navigation,
  preventing progress drift during repeated typography changes.
- Updated tests to cover the new shelf/pagination workflows replacing old single-book
  scrolling expectations. Added legacy migration, delete failure and mobile checks.
- Duration: approximately 25 minutes (estimate; no exact start timer recorded).
- Final verification: 4 component tests and 5 Edge end-to-end tests passed, including
  real Alice, migration, deletion failure and mobile. Production build passed.
  Corrected unsupported Testing Library `exact` option in unit tests before the
  final standalone TypeScript check. Reader/shelf screenshots inspected locally.


## 2026-10-31 — Increment 8: light/dark reading themes

- Tool: OpenAI Codex desktop, terminal/apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md, existing settings code, reader and stylesheet before implementation.
- Added a light/dark selector in reading settings with validated localStorage load
  and fallback to light. Failed saves apply the choice and display a notice.
- Converted interface surfaces, text, borders, hover and error colors to theme
  variables. EPUB themes override text/background/link colors without inverting
  images. Use the existing CFI/memory-position mechanism when reopening the renderer.
- Tests check UI and actual EPUB computed styles (including author-styled paragraphs),
  saved selection, same-paragraph preservation, refresh, replacement, corrupt theme
  values and failed preference writes. Existing Alice regression remains included.
- Time: approximately 5 minutes (estimate; no exact start timer recorded).
- Final validation: 7 component tests and all 10 Edge browser tests passed. The
  strengthened author-color theme checks also passed separately; production build
  and TypeScript checking passed. No dependencies were added.

## 2026-10-31 — Increment 7: font size preference

- Tool: OpenAI Codex desktop, terminal/apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md and existing reader, progress and test code before implementation.
- Added a collapsible reading settings panel with six body font sizes from 14 to
  28 px (default 18). Load/save a validated localStorage preference, shared across
  books. Storage errors show a notice; changes still apply for the current session.
- Apply epub.js body and paragraph styles before display. A size change rebuilds
  the rendition at the current CFI, with a memory copy of progress for unavailable
  localStorage. Existing chapter navigation and page controls remain in place.
- Added component coverage for panel controls and saved selection. Browser tests
  inspect actual paragraph styles, same-paragraph recovery, refresh, replacement,
  corrupt saved values and failed settings writes.
- Time: approximately 5 minutes (estimate; no exact start timer recorded).
- Final validation: 6 component tests and 8 Edge browser tests passed, including
  the existing Alice regression; production build and TypeScript checking passed.
  No dependencies were added.

## 2026-10-31 — Increment 6: previous/next screen controls

- Tool: OpenAI Codex desktop, terminal/apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md and epub.js rendition/continuous-manager implementation.
- Added previous/next controls using rendition.prev/next with a synchronous action
  guard shared with TOC jumps. Loading/error/busy and book-edge states disable
  unavailable controls. Each turn reports CFI and updates existing chapter markers.
- Tests caught premature epub.js atEnd flags in scrolled mode. Edge detection now
  combines the first/last spine section with actual scroller geometry.
- Added browser coverage for screen movement, forward/backward chapter crossing,
  refresh recovery, exact start/end and one-screen books. Fixed an assertion that
  incorrectly treated a transient busy button as a settled edge state.
- Time: approximately 7 minutes (estimate; no exact start timer recorded).
- Final validation: 5 component tests and 6 Edge browser tests passed; production
  build and TypeScript checking passed. No dependencies were added.

## 2026-10-31 — Increment 5: chapter navigation

- Tool: OpenAI Codex desktop, terminal/apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md and installed epub.js navigation/section APIs.
- Render nested EPUB TOC entries into the sidebar via a React portal. Clicking
  an entry calls rendition.display; relocation updates the current-entry marker
  using spine section and anchor CFI comparisons. Existing position persistence
  records chapter jumps. External/non-spine targets are rejected with a notice.
- Added component tests for nested lists, selection, current marker and empty TOC;
  browser coverage for chapter/anchor jumps, refresh, collapse, invalid targets,
  old-TOC cleanup on replacement, and the user's real Alice book.
- Time: approximately 5 minutes (estimate, no exact timer recorded).
- Final validation: 5 component tests and 5 Edge browser tests passed, including
  jumping to Alice Chapter II and restoring its current-entry marker after refresh.
  Production build and TypeScript checking passed. No dependencies were added.
- Current-entry highlighting tracks the viewport's starting location; multiple
  headings on a short page can share one viewport, rather than each becoming
  the current entry merely because it was clicked.

## 2026-10-31 — Increment 4: reading position recovery

- Tool: OpenAI Codex desktop, terminal/apply_patch, Playwright/Edge and Vitest.
- Read AGENTS.md; inspected installed epub.js API types and implementation for
  CFI relocation events, rendering and continuous-scroll behavior.
- Save EPUB CFI in localStorage by SHA-256 of the complete file, avoiding name or
  metadata collisions. Restore before enabling position writes; flush the latest
  reported CFI on pagehide and cleanup. Invalid positions fall back to the start;
  position-storage errors show a notice without blocking reading.
- A real-browser test caught suppression of the first scroll in continuous mode.
  Added a debounced capture listener to request a location report after scrolling.
- Tests check scrolling/refresh, different files with the same name and metadata
  identifier, renamed identical bytes, invalid saved CFI and failed localStorage writes.
- Renderer precision: restored ranges can round to a nearby line; tests assert the
  same paragraph and a nonzero restored scroll position rather than exact pixels.
- Time: approximately 10 minutes (estimate, not a precise timer).
- Final validation: 3 component tests and all 4 Edge browser tests passed;
  production build and TypeScript checking passed. No dependencies were added.

## 2026-10-31 — Increment 3: local book persistence

- Tool: OpenAI Codex desktop, terminal/apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md and inspected current code before implementation.
- Added IndexedDB storage with a single current-book key. Writes are accepted
  only when the transaction completes, before switching the active reader.
- On startup, load and validate stored EPUB bytes; show recovery/loading and
  actionable errors. Storage failure leaves the previous book intact.
- Browser checks cover refresh, replacement followed by refresh, corrupt import,
  corrupt stored bytes, unavailable storage and quota/write failure. The user's
  local Alice file is also imported and restored; it remains untracked.
- Reading-position and settings persistence are deferred to later increments.
- Validation: 3 component tests and 3 Edge browser tests passed; production build
  and TypeScript checking passed. No external service or new dependency was added.
- Time: approximately 5 minutes (estimate; no exact timer recorded).

## 2026-10-31 — Increment 2: EPUB import and rendering

- Tool: OpenAI Codex desktop; terminal, apply_patch, Vitest and Playwright/Edge.
- Read AGENTS.md; consulted the official epub.js README for rendering and its
  `allowScriptedContent` sandbox option. Book files are test data, not instructions.
- Added file selection, archive/container checks, loading/error states, browser-only
  epub.js rendering, cleanup on replacement, and explicit script disabling.
- Scope: continuous scrolling only. Persistence, pagination controls, chapter
  navigation and settings are intentionally deferred to separate increments.
- Tested the user's local Alice EPUB, plus generated sample/replacement books and
  a corrupt archive. Root EPUB files are ignored and excluded from the commit.
- Browser tests: 2 passed, including real Alice rendering and script sandbox checks.
  Component tests: 3 passed. Type checking and production build passed.
  Initial assertions accidentally matched Next.js's route announcer; scoped them
  to the reading area and reran successfully.
- Existing development output was locked; isolated E2E and build output directories
  avoid interfering with a running development server.
- Time: approximately 10 minutes (estimate, no exact start timer recorded).

## 2026-10-31 — Increment 1: application foundation

- Tool: OpenAI Codex desktop (terminal and apply_patch); frontend-design skill
  used for layout and typography guidance. Sites skill consulted for local-only
  workflow; no hosting or publication performed.
- Read AGENTS.md and inspected the existing Git repository before implementation.
- Scope: Next.js App Router + TypeScript setup, responsive reader empty state,
  and accessible collapsible contents panel. Import/settings are explicitly disabled.
- Added interaction tests for the empty state, disabled controls, and contents toggle.
- Time: approximately 15 minutes of interactive implementation and verification
  (estimate; no precise start timer was recorded), including dependency downloads.
- Validation: `npm test` passed both interaction tests; `npm run typecheck`
  passed; `npm run build` passed. Production preview returned HTTP 200 and
  included the expected empty-state heading. No visual browser QA was performed.
- Environment issues: npm mirror downloads stalled, so installation used the
  official registry. Pinned jest-dom to Node 20-compatible v6. Sandbox file/socket
  restrictions required checks outside the sandbox. Reinstalled an incomplete
  native SWC dependency; the final build passed without compiler load warnings.
- Data policy clarification for later increments: clearing browser site data removes
  locally stored books and settings; refresh should preserve them.
