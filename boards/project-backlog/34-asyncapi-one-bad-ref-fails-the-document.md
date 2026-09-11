---
column: review
labels: [core, asyncapi]
priority: high
package: core
agent: claude
live: false
status: Broken refs degrade to markers; document still renders
progress: 100
updatedAt: 2026-09-12T01:35:00.000Z
---
# One bad $ref makes a whole AsyncAPI document fail to load

OpenAPI and OpenRPC resolve references through `dereferenceDocument`
(packages/core/src/formats/shared.ts:28) with `continueOnError`, so an unresolvable pointer
becomes an explicit marker in the rendered output and everything else still reads.

AsyncAPI does not. `@asyncapi/parser` throws and abandons the entire document, so a single
broken `$ref` anywhere — an unreachable external URL or a dangling internal pointer — means
apibox shows nothing at all for that file.

Card 21 raised this as unverified. It was then checked empirically against both failure
shapes and **confirmed as a real gap**, not a theoretical one. The current throw-behaviour is
pinned by a test so a fix cannot land silently.

This matters more than its size suggests: a reader with a large AsyncAPI document and one
stale reference gets an unusable page rather than a mostly-complete one, and nothing tells
them which pointer caused it.

## Options

- Pre-resolve through the shared `dereferenceDocument` helper before handing the document to
  `@asyncapi/parser`, matching how the other two formats behave.
- Catch the specific resolver failure and stub the unresolvable target, so parsing continues.

## Checklist

- [x] Choose an approach and record why
- [x] A broken external URL degrades to a marker, not a failed document
- [x] A dangling internal pointer does the same
- [x] Warning parity with OpenAPI and OpenRPC, checked side by side
- [x] Replace the test pinning today's throw-behaviour

## Comments

- **claude** (2026-09-12T01:35:00.000Z): Taken ahead of bindings (card 19). Bindings add missing detail to documents that already render; this one decides whether a document renders at all. A reader with one stale reference currently gets a blank failure and no indication which pointer caused it, which is a worse experience than any amount of missing binding detail.
- **claude** (2026-09-12T02:05:00.000Z): Fixed, and the predicted trap was real — pre-resolution alone does not work. Three findings, each established empirically before anything was built on it. (1) Handing the fully resolved document to `@asyncapi/parser` still throws, because it runs its own resolution afterwards and treats any leftover `$ref` key as its own to resolve; `continueOnError`'s leave-the-ref-in-place convention, which is exactly what lets OpenAPI and OpenRPC survive, does not outlive a second resolver pass. (2) Pre-inlining every valid `$ref` broke AsyncAPI's own security-scheme-name recovery, which depends on JS object identity surviving the parser's internal resolution — caught by an existing test rather than guessed at. (3) A genuinely circular schema, pre-inlined, produces a cyclic object that crashes the parser's AJV validation.
- **claude** (2026-09-12T02:05:00.000Z): Final approach avoids all three: run `dereferenceDocument` purely to DISCOVER which pointers are broken, discard its resolved output entirely, then patch only those exact paths in a clone of the original document with an `x-apibox-unresolved-ref` marker. Every valid `$ref` is left for `@asyncapi/parser` to resolve exactly as before, so identity-dependent behaviour is preserved. The marker is swapped back to a literal `$ref` before `normaliseSchema` sees it, producing the same `SchemaNode.unresolvedRef` the other two formats produce — warning parity by construction rather than by imitation.
- **claude** (2026-09-12T02:05:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 139 files, core 138 to 141, ui 166, cli 7, extension 17, viewer 20, e2e 28. `dereferenceDocument` gained an options parameter but both existing call sites pass nothing, so OpenAPI and OpenRPC behaviour is bit-identical.
