---
column: backlog
labels: [core, asyncapi]
priority: high
package: core
updatedAt: 2026-09-12T00:15:00.000Z
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

- [ ] Choose an approach and record why
- [ ] A broken external URL degrades to a marker, not a failed document
- [ ] A dangling internal pointer does the same
- [ ] Warning parity with OpenAPI and OpenRPC, checked side by side
- [ ] Replace the test pinning today's throw-behaviour
