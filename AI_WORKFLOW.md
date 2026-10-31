# AI workflow

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
