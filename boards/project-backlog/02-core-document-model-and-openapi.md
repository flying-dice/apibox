---
column: review
labels: [core, openapi]
priority: high
agent: claude
package: core
live: false
updatedAt: 2026-09-10T15:40:00.000Z
---
# Core document model and OpenAPI normaliser

`@apibox/core` turns a spec file into the normalised `ApiDocument` model that every
renderer consumes. Nothing in the UI ever sees a raw OpenAPI object — that boundary
is what lets a fourth format be added later without reopening the UI.
See decisions/02-normalised-document-model.md.

The hard part is the schema normaliser. Dereferencing turns recursive schemas into
genuinely cyclic object graphs, so the walker has to detect back-references by object
identity or it recurses forever.

## Checklist

- [x] `ApiDocument` / `SchemaNode` / `Manifest` types
- [x] Loader (file + URL, YAML + JSON) and content-based format detection
- [x] Schema normaliser with cycle detection
- [x] OpenAPI parser: info, servers, security, operations, schemas, nav
- [x] Format plugin registry and public entry point
- [x] AsyncAPI normaliser (minimal)
- [x] JSON-RPC / OpenRPC normaliser (minimal)
- [x] Tests over the example specs, a cyclic spec and a Swagger 2.0 rejection

## Gates

- [x] tests-passing — typecheck, biome and vitest green; 69 tests in packages/core (claude, 2026-09-10T15:39:00.000Z)
- [x] agy-review — three rounds with gemini-3.1-pro-high, plan mode, sandboxed; all findings above 0.5 fixed or explicitly declined with reasoning (claude, 2026-09-10T15:11:00.000Z)
- [x] codex-review — gpt-5.6-terra, read-only sandbox, ephemeral; four defects found and all four fixed with tests (claude, 2026-09-10T15:39:00.000Z)
- [x] clean-code-review — no marker above 0.5; the one DRY finding was fixed rather than tagged (claude, 2026-09-10T15:11:00.000Z)

## Comments

- **claude** (2026-09-10T14:26:14.000Z): Defined the document model in packages/core/src/types.ts:1-359. Composition keywords are preserved rather than merged — showing a reader "one of these three shapes" is more honest than a synthesised union that appears nowhere in the spec. Wrote the schema normaliser at packages/core/src/schema.ts:60-190; it tracks ancestors in an identity Map and emits a `circularRef` marker instead of descending, which is what stops `Pet.parent` from hanging the renderer. Loader and detector at packages/core/src/load.ts:1-70 and packages/core/src/detect.ts:1-40 — detection reads the document's version marker rather than trusting the filename. OpenAPI parser at packages/core/src/formats/openapi/index.ts:1-470: it recovers component names after dereferencing by object identity (packages/core/src/formats/openapi/index.ts:112-124), so an inlined $ref still renders as `Pet` instead of an anonymous blob.
- **claude** (2026-09-10T14:50:00.000Z): Finished the remaining parsers and the entry point. AsyncAPI goes through `@asyncapi/parser` (packages/core/src/formats/asyncapi/index.ts:26-40) specifically because it presents 2.x and 3.x through one interface — most AsyncAPI in the wild is still 2.x, and modelling both shapes ourselves was not worth it. OpenRPC is hand-parsed at packages/core/src/formats/jsonrpc/index.ts:24-70; there is no off-the-shelf renderer or parser worth wrapping for JSON-RPC. Entry point at packages/core/src/parse.ts:24-40 dispatches on the detected format so callers never name it.
- **claude** (2026-09-10T14:50:00.000Z): Ran the Antigravity review (gemini-3.1-pro-high, plan mode, sandboxed). First run returned nothing — headless mode auto-denied a `command` permission because this repo was not in `trustedWorkspaces`; added it and re-ran rather than using `--dangerously-skip-permissions`. The review returned nine findings. I reproduced the top five against the real code before touching anything, and all five were genuine:

  1. **Broken external `$ref` wiped all schemas** (severity 1.0). Dereferencing failure left raw `$ref` keys that normalised to empty schemas. Fixed at packages/core/src/schema.ts:78-91 — an unresolved `$ref` now becomes an explicit `unresolvedRef` marker, so a reader sees "this reference could not be resolved" instead of a schema that appears to describe nothing. Proven end to end by the fixture at packages/core/test/fixtures/broken-external-ref.yaml:1-23 and the test at packages/core/src/parse.test.ts:159-176.
  2. **`additionalProperties: false` conflated with absent** (1.0). Fixed at packages/core/src/schema.ts:157-165. The two must stay distinct: "no extra fields allowed" and "the document did not say" are different facts about an API.
  3. **Multiple composition keywords dropped** (0.9) — worse than reported: with `allOf` and `oneOf` together it kept `oneOf` and dropped `allOf`, silently losing the mixin. This needed a model change, `SchemaNode.compositions` as a list (packages/core/src/types.ts:60-72), fixed at packages/core/src/schema.ts:180-195.
  4. **Array tuples truncated to `items[0]`** (0.8). Fixed at packages/core/src/schema.ts:167-178, covering both draft-4 array-form `items` and 2020-12 `prefixItems`.
  5. **`required` keys absent from `properties` vanished** (0.6). Fixed at packages/core/src/schema.ts:142-152 with a placeholder node.
  6. **Extensions rendered as HTTP statuses** (0.4) — `x-internal` under `responses` became a status that sorted above `200`. Fixed at packages/core/src/formats/openapi/index.ts:227.

  Declined finding 8, DAG duplication (0.3): cloning the ancestor map per branch is what makes cycle detection path-based. A shared `seen` map would use less memory but would wrongly mark a sibling's reuse of a component as circular, which is a correctness regression traded for a memory saving we have no evidence we need. Below the 0.5 threshold, so no marker.

  Tests went 42 → 57, all green.
- **claude** (2026-09-10T14:50:00.000Z): Cleared my own DRY finding from the clean-code pass. `collectComponentNames` and `parseComponentSchemas` were byte-identical between the OpenAPI and OpenRPC parsers and `dereference` near-identical — verified by comparing the extracted function bodies, not by eye. All now live in packages/core/src/formats/shared.ts:1-118, along with `parseContact`, `parseLicense` and `parseExternalDocs`. One casualty worth recording: my first extraction used a regex with `re.S` over an optional docblock, which over-matched and silently ate the top of packages/core/src/formats/openapi/index.ts including `parseOpenApi` itself. Typecheck caught it immediately; restored at packages/core/src/formats/openapi/index.ts:31-92. Nothing was committed, so nothing was lost.
- **claude** (2026-09-10T15:12:00.000Z): Round two of the review caught a regression my own round-one fix introduced, which is the most useful thing that happened today. Returning the untouched document whenever dereferencing threw meant one unreachable external URL abandoned the *whole* pass, leaving every **internal** `$ref` unresolved — in a typical spec, the entire document renders as unresolved markers, strictly worse than the bug I was fixing. It also correctly noted my test was too weak to catch it: it asserted the broken ref was marked but never that valid refs still resolved. Reproduced both before fixing.

  Rewrote packages/core/src/formats/shared.ts:16-72 to dereference with `continueOnError`, take the partially resolved document from `parser.schema`, warn once per failure with its path, and write the original `$ref` back where the parser leaves `null`. Regression test at packages/core/src/parse.test.ts:178-191 asserts the internal `$ref` still resolves; it fails against the old behaviour by construction.
- **claude** (2026-09-10T15:12:00.000Z): Round three reviewed only the new dereference code and found more. Verified each claim rather than taking it on trust — one was wrong: it reported that numeric array indices are stripped by the `typeof segment === 'string'` filter, but the parser emits every path segment as a string, `"1"` included, so nothing was stripped. The *effect* it described was real via a different cause: `asRecord` returns undefined for arrays, so walking a path through `parameters` aborted and left a bare `null`. Confirmed with a probe before changing anything.

  Fixed at packages/core/src/formats/shared.ts:100-175: `at`/`setAt` handle arrays and objects uniformly; `UNSAFE_KEYS` blocks `__proto__`, `constructor` and `prototype`, written via `defineProperty` so an inherited setter cannot intercept; a reference that failed inside a nested external document, which has no counterpart in the root, falls back to the URL from the error message so the location is never left as `null`; and `resolutionFailures` no longer throws on a null error or a malformed entry.

  New tests at packages/core/src/formats/shared.test.ts:1-120 cover the array case, the prototype-pollution case and warning readability. Writing the pollution test surfaced a bug in the test itself: `properties.__proto__ = x` invokes the prototype setter rather than creating a property, so it was testing nothing. It now parses the document from raw JSON, which both creates a genuine own property and matches how a spec actually arrives.

  Declined the boolean-root finding (0.1): `asRecord` already narrows it and an OpenAPI root is always an object. One acknowledged limit, not a bug: an unresolved `$ref` standing in for a whole parameter still cannot render as a parameter, since it has no `name`. It is reported in the warnings with its path, which is the honest outcome.

  Tests 42 → 63 across the three rounds.
- **claude** (2026-09-10T15:40:00.000Z): Second opinion from Codex (`gpt-5.6-terra`, read-only sandbox). Sharper than the earlier rounds because it ran in-memory probes rather than reading alone, and it deliberately went at the parsers that had seen least scrutiny. Four defects, all real, all reproduced before fixing:

  1. **OpenAPI `content`-based parameters and headers lost their schema entirely** (high). OpenAPI permits `content` in place of `schema` on both Parameter and Header objects, and it is the prescribed way to describe a parameter whose value is a JSON object — not an obscure corner. We read only `schema`, so such parameters rendered as untyped. Fixed with `parseSchemaOrContent` at packages/core/src/formats/openapi/index.ts:255-276, which populates `content` with the media type and also sets `schema` from a lone media type, so a renderer that only understands `schema` still shows a type.
  2. **AsyncAPI 2.x channel parameters were all untyped** (high). 2.x nests a JSON Schema under the Parameter Object's `schema`; 3.x describes the parameter inline. We normalised the v2 Parameter Object itself, producing `types: []` for every typed channel parameter in every 2.x document — and 2.x is still the majority of AsyncAPI in the wild, which was the entire reason for taking the `@asyncapi/parser` dependency. Fixed at packages/core/src/formats/asyncapi/index.ts:140-155.
  3. **OpenRPC examples could contradict the declared parameter encoding** (medium). We chose object-vs-array purely from whether every example item had a name, ignoring `paramStructure`, so a `by-position` method rendered a named-object example that the method would reject. Fixed at packages/core/src/formats/jsonrpc/index.ts:155-165 — the declared structure is now the authority.
  4. **Array-or-null labels dropped the nullability** (medium). `type: ['array', 'null']` labelled as `string[]`, overstating what the endpoint accepts. Fixed at packages/core/src/schema.ts:265-284.

  It also confirmed the shared dereference hardening from the previous round, finding no further correctness or prototype-pollution defect there.

  Its coverage criticism was fair and is now addressed: the AsyncAPI tests covered only 3.0 and asserted a parameter's *name* rather than its schema, which is precisely why defect 2 survived three earlier rounds. There is now a 2.6 fixture at packages/core/test/fixtures/v2-streetlights.asyncapi.yaml:1-24 and behavioural tests at packages/core/src/parse.test.ts:265-287.

  Tests 63 → 69.
