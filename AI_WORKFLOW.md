# AI workflow

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
