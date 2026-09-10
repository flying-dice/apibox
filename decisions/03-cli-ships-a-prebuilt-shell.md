---
status: Accepted
date: 2026-09-10
---
# Decision 03 — The CLI ships a prebuilt shell and writes JSON

## Context

`bunx github:flying-dice/apibox` should feel instant. The obvious approach — have the CLI
run a real SvelteKit or Vite build per invocation — means shipping the whole build
toolchain to the user's machine and waiting tens of seconds for a site that is, in the
end, the same shell every time with different data in it.

## Decision

The viewer is a plain Svelte + Vite SPA, built **once** at release time and committed to
`packages/cli/assets/viewer/`. A CLI run parses the input specs, writes
`data/manifest.json` and `data/<id>.json`, and copies the prebuilt shell. Routing is
hash-based (`#/<docId>/<sectionId>`) so the single `index.html` works on GitHub Pages and
inside a webview with no server.

Assets are committed by a release workflow rather than produced by a `prepare` script,
because `prepare` cannot be relied upon to fire for a git dependency of a workspace root.

## Consequences

- A CLI run is file I/O only: roughly a second, no toolchain, no network.
- The CLI ships the Inner App only. VS Code mounts that Inner App in its webview, while
  the APIBox-owned Pages deployment wraps it in a separate PWA Outer App. The shared
  renderer and navigation cannot visually drift between hosts.
- No per-page HTML. The site needs JavaScript and is not indexable per operation. If SEO
  becomes a requirement, an optional prerender pass can emit real HTML per operation and
  hydrate the same bundle — the architecture leaves room for it.
- Built assets live in git, which makes the repo noisier. Confining them to one directory
  written only by CI keeps the noise contained.
