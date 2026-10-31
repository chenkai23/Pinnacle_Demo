# AI workflow

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
