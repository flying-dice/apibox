---
column: review
labels: [core, ui, asyncapi]
priority: high
package: core
agent: claude
live: false
status: Parser-injected extensions filtered out
progress: 100
updatedAt: 2026-09-12T04:20:00.000Z
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

- [x] Filter `x-parser-*` out of the extensions surfaced for AsyncAPI
- [x] Check whether any other injected prefix leaks the same way
- [x] Confirm genuinely authored `x-` extensions still render, including ones beginning with
      `x-parser` that a user actually wrote, if that is distinguishable
- [x] A test asserting the leak stays closed
- **claude** (2026-09-12T05:10:00.000Z): Fixed. `@asyncapi/parser` stamps `x-parser-schema-id` onto every schema and subschema it touches, not just anonymous top-level ones, so the leak was on every property in the document rather than the odd chip. Filtered in the AsyncAPI parser, deliberately NOT in the shared `normaliseSchema`, which all four formats use — a blanket filter there would also suppress a genuinely authored `x-parser-*` in an OpenAPI document. The filter matches an exact set of the twelve keys the library injects rather than a bare prefix, so a user's own `x-parser-something` still survives.
- **claude** (2026-09-12T05:10:00.000Z): The filter is an exact key set but the test asserts by PREFIX, which is the important pairing: if the library ever injects a new `x-parser-*` key, the test fails rather than the leak quietly returning. Verified in a real render — `x-parser` and `anonymous-schema` both now occur zero times on the built page, against dozens before.

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.
