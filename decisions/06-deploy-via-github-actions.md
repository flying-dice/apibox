---
status: Accepted
date: 2026-09-10
---
# Decision 06 — Deploy to Pages via a workflow, not a local push

## Context

"Deploy a static site" from a VS Code command can work two ways: build locally and push
the result to a `gh-pages` branch, or commit a workflow and let GitHub build it.

A local push means the extension performs git surgery in the user's repository and needs
credentials for it — both things an extension should be reluctant to do, and both things
that fail in interesting ways behind corporate proxies and with SSH agents.

## Decision

`APIBox: Deploy Static Site to GitHub Pages` scaffolds `.github/workflows/apibox-pages.yml`
(checkout → `bun x apibox build` → `actions/deploy-pages`) and offers to commit and push it.
GitHub builds and publishes.

## Consequences

- No credential handling in the extension, and no local git surgery.
- The site rebuilds whenever the specs change, not only when someone remembers to run the
  command. Deployment becomes a property of the repository rather than of one developer's
  machine.
- First-run setup requires the user to enable Pages with the "GitHub Actions" source. The
  command should say so plainly rather than failing opaquely.
- A direct `gh-pages` push remains possible later behind the same command, for users
  without Actions.
