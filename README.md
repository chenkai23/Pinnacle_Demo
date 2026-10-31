# Local EPUB Reader

A local-first EPUB reader built with Next.js App Router, TypeScript and React.

## Run

Use Node.js 20.9+ (Node.js 22 LTS recommended) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For production, run `npm run build` then `npm start`.

## Validate

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

## Architecture

```mermaid
flowchart TD
    Page[Next.js App Router page] --> Shell[Client reader shell]
    Shell --> Contents[Collapsible contents panel]
    Shell --> Area[Reading area / empty state]
    Area --> Epub[Browser-only epub.js renderer]
    File[Local EPUB file] --> Validation[ZIP and container validation]
    Validation --> Epub
    Validation --> Storage[IndexedDB: current book]
    Storage --> Shell
    Epub --> Position[localStorage: CFI keyed by file SHA-256]
    Position --> Epub
```

## Current scope and limitations

Import one EPUB and read its contents by scrolling. Importing another book replaces
the current book. Invalid archives show an error and keep the current book.
Book scripts are disabled via the renderer's iframe sandbox. EPUB code only loads
in the browser. DRM-protected EPUBs are unsupported.

The current book is saved in IndexedDB and reopened after refresh in the same
browser and origin. Replacement is committed to storage before switching the
reader; a failed write leaves the previous book intact. Clearing site data deletes
the book. Private browsing and storage quotas may limit persistence.

Reading position is saved as an EPUB CFI in localStorage, keyed by the SHA-256
hash of the file bytes. Refresh or reimporting the same file restores the position;
different files do not share progress even if their names or metadata match.
The renderer may round the restored location to a nearby line in the same paragraph.
Invalid saved positions fall back to the beginning. Storage failures show a notice
and do not prevent reading. Allow a moment after scrolling for position updates.

Page buttons, chapter navigation, settings, a standalone sample EPUB and Docker
support remain future increments.
No backend, external API or remote font is used.

Browser tests require Microsoft Edge (`npx playwright install msedge` if absent).
They generate a small EPUB in memory to check rendering, replacement, invalid input,
script sandboxing, refresh recovery, corrupt stored data and storage failures.
They also check CFI recovery after a single scroll, per-file isolation, reimporting
a renamed file, invalid CFI fallback and unavailable position storage.
An additional test uses the optional root-level file
`Alice's Adventures in Wonderland by Lewis Carroll.epub` when present. Root EPUBs
are ignored by Git and are never served as public assets.
