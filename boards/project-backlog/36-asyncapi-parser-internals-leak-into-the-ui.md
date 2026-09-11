---
column: backlog
labels: [core, ui, asyncapi]
priority: high
package: core
updatedAt: 2026-09-12T04:05:00.000Z
---
# Parser internals leak into the rendered document

An AsyncAPI document renders chips reading `x-parser-schema-id <anonymous-schema-2>` against
its payloads. Nobody wrote that. `@asyncapi/parser` injects `x-parser-*` extensions into the
document as it resolves it, and card 23's `x-*` extension passthrough faithfully surfaces them
because it cannot tell an authored extension from an injected one.

The result is internal machinery presented to a reader as though it were part of their API
description, and `<anonymous-schema-2>` means nothing to anyone outside the parser.

Found by looking at a real render while reviewing card 19. No test catches it: the extension
passthrough is working exactly as specified, and every assertion about it passes.

## Checklist

- [ ] Filter `x-parser-*` out of the extensions surfaced for AsyncAPI
- [ ] Check whether any other injected prefix leaks the same way
- [ ] Confirm genuinely authored `x-` extensions still render, including ones beginning with
      `x-parser` that a user actually wrote, if that is distinguishable
- [ ] A test asserting the leak stays closed
