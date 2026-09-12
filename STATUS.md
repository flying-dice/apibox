# apibox — status

**Updated:** 2026-09-12 12:40 UTC · **Branch:** `main` · **Working tree:** clean, all work pushed

## Goal / health

Bootstrap a Bun workspace delivering API documentation three ways from one rendering
engine: a VS Code extension, a static site generator, and a GitHub Pages deploy — now
covering **four** formats: OpenAPI, AsyncAPI, JSON-RPC/OpenRPC and standalone JSON Schema.
See `docs/01-overview.md` and `decisions/08-json-schema-as-fourth-format.md`.

**Health: 44 cards, all implemented, all in Review.** Both script gates pass on every card —
typecheck 10x "0 ERRORS", biome clean over 148 files, and core 211 / ui 226 / cli 7 /
extension 17 / viewer 20 / e2e 28, up from 268 tests at the start of this work.

**Not done.** Every card sits in Review because the board's Done gate is `peer-reviewed:
true`, labelled "Signed off by a human". No human has signed off, so the field is unset on
all 44. That is deliberate: setting it agent-side would make the field mean "the agent
finished this" rather than "a human checked this", on every card from then on.

## Coverage

Four spec-coverage assessments live in `docs/06-spec-coverage/`. All three pre-existing
reports are marked superseded: cards 38-44 closed every gap they list, including constructs
earlier recorded as deliberate omissions. Every construct the audits enumerated is now both
parsed and rendered. The reports' matrices are historical; re-audit before citing a figure.

Deliberate non-implementations remaining: none.

## Known unverified

Card 33's VS Code activity-bar rail has never been seen in a running window — the tree
logic, contributions and build are tested, but no GUI verification has happened. Run
`bun run dev:extension` with a full window restart.

## Now

Nothing is in progress. The last card closed was 44, which implemented the final four
constructs previously recorded as deliberate skips.

This session added JSON Schema as a fourth format (cards 24-26, ADR 08), reworked the viewer
for density (28-31: content-height sidebar, collapsed items, 90px rows down to 36px, scroll-spy
rewritten), added a VS Code activity-bar rail (33), fixed the dev CLI serving a stale shell
(32), and closed every spec-coverage gap across all four formats (15-23, 34-44).

## What to do next

1. **Sign off, or change the gate.** 44 cards are waiting on `peer-reviewed`. Either review
   them, delegate the criterion explicitly, or remove the field from `.config.json`.
2. **Look at the VS Code rail.** `bun run dev:extension`, full window restart. It is the only
   piece of this work with no visual verification behind it.
3. **Re-audit if a coverage number is needed.** The four reports in `docs/06-spec-coverage/`
   are marked superseded; their matrices predate cards 38-44.

## Lessons worth keeping

Five defects this session passed a fully green test suite and were caught only by building a
site and looking at it: a duplicated description, a 90px surface, a CSS rule Svelte silently
pruned to a no-op, parser internals leaking into every schema row, and schema examples parsed
by every format and rendered by none.

Four separate times a new or newly-optional field made a previously valid document fail
`isApiDocument`. That surfaces as a blank viewer and e2e "element(s) not found", never as a
unit test failure. Any change adding a field to the model must also teach `packages/core/src/validate.ts`.
