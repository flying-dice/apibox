---
column: review
labels: [core, infra]
priority: high
package: core
agent: claude
live: false
status: Core complete — 89 tests green, awaiting renderer
progress: 100
updatedAt: 2026-09-11T13:40:00.000Z
---
# JSON Schema format: detection, model and parser

First of three cards adding standalone general-purpose JSON Schema documents (UI form
schemas, config schemas) as a fourth format. See decisions/08-json-schema-as-fourth-format.md
for the detection decision and its rationale.

Detection is **explicit-signal only**: a recognised `$schema` dialect URI, or an explicit
`--format jsonschema` / `ParseOptions.format`. No filename signal, no structural
heuristics. The reason is that detection is unsound in principle — every JSON object is a
valid JSON Schema and unknown keywords are legal — so `apibox build '**/\*.json'` must never
be able to turn a `package.json` into a published page.

Because `$schema` is forced, the dialect it declares is a real document-declared version.
`ApiDocumentBase.version` therefore stays **required**, populated from the dialect. No
change to the model base or the manifest format.

Riskiest assumption first: prove the false-positive rate is zero against a corpus of
non-schemas (package.json, tsconfig.json, a CI workflow, a Biome config) before building
anything downstream.

## Checklist

- [x] `ParseOptions.format` and dialect-URI detection in detect.ts
- [x] False-positive corpus test: non-schema JSON files must never detect as jsonschema
- [x] `JsonSchemaDocument` variant; widen `FormatId`; validate.ts branch
- [x] Parser: root schema, `$defs` **and** `definitions`, name map, dialect warnings, nav
- [x] Accept 2020-12, 2019-09, draft-07, draft-06, draft-04
- [x] Warn on unrecognised `$schema` rather than guessing
- [x] Repo-wide typecheck green (this is where the FormatId blast radius surfaces)

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T13:00:00.000Z): Started. Detection is explicit-signal only per decisions/08-json-schema-as-fourth-format.md — recognised `$schema` dialect URI or explicit `ParseOptions.format`, no filename or shape heuristics. `version` stays required (packages/core/src/types.ts:165) and is populated from the dialect, so `ApiDocumentBase` and the manifest format are untouched. Widening `FormatId` (packages/core/src/types.ts:10) is expected to break typecheck in ui/viewer/cli/extension; that is card 25/26 work and is being reported, not fixed, here.
- **claude** (2026-09-11T13:40:00.000Z): Core complete. Detection in packages/core/src/detect.ts matches dialect URIs tolerantly (http/https, optional trailing `#`) across 2020-12/2019-09/draft-07/draft-06/draft-04; `DetectionHints` and `ParseOptions.format` are both optional so the exported signatures stay source-compatible. Parser at packages/core/src/formats/jsonschema/index.ts reads both `$defs` and `definitions` with its own identity-keyed name map. `version` is populated from the dialect per decisions/08, so `ApiDocumentBase` and the manifest are untouched.
- **claude** (2026-09-11T13:40:00.000Z): Verified independently, not just reported — ran `bun run --cwd packages/core test` myself: 89 passed. The false-positive corpus at packages/core/src/parse.test.ts:86-105 is the load-bearing test; note `biome.json` carries a `$schema` key pointing at biomejs.dev, so it proves detection matches the dialect URI rather than the mere presence of `$schema`. Widening `FormatId` broke no downstream typecheck, but packages/viewer/src/ViewerShell.svelte:149-164 falls through its `{:else}` to the empty-workspace state for an unhandled kind — a silent runtime gap CI cannot catch, handed to card 25.
