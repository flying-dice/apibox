---
status: Accepted
date: 2026-09-10
---
# Decision 07 — Keep browser workspaces local-first

## Context

The hosted documentation viewer needs to be useful as a personal API workbench without
requiring an account, a repository or a server upload. Browser storage must support
multiple named workspaces and API documents that are larger than localStorage's practical
limits, while the shipped examples remain available to every visitor.

## Decision

The GitHub Pages PWA is an **Outer App**. It stores user-created workspace records and
normalized imported documents in IndexedDB, and a small localStorage preference remembers
the active workspace. It embeds the reusable **Inner App**, which owns API navigation and
the schema/document viewer. The bundled site manifest remains a read-only Examples
workspace.

CLI output has no Outer App and publishes only the Inner App. In the extension, Visual
Studio Code itself is the Outer App: it owns files and workspaces, while the same Inner App
is mounted into the webview and reads through the extension host.

Imports are parsed in the browser and committed per file, so one invalid file does not
discard other valid imports. The application shell is cacheable by a service worker and
advertised by a web app manifest; workspace data itself remains outside the cache and is
never transmitted by APIBox.

## Consequences

- Workspaces and imported files survive refreshes and offline use on the same browser
  profile, but do not synchronize between devices or private browsing sessions.
- Clearing site data removes local workspaces; destructive workspace deletion therefore
  requires an explicit in-product confirmation.
- IndexedDB schema changes need migrations and storage tests.
- External references that are not embedded in an imported file cannot be resolved until
  multi-file reference resolution is introduced; the importer reports parser warnings.
- The examples stay immutable, providing a safe fallback when no local workspace exists.
