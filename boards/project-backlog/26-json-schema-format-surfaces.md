---
column: review
labels: [cli, extension, infra]
priority: med
package: cli
agent: claude
live: false
status: Surfaces complete — e2e guard proven by deletion
progress: 100
updatedAt: 2026-09-11T15:00:00.000Z
---
# JSON Schema format: CLI, extension and docs

Third of three. Depends on cards 24 and 25.

Mostly small. The VS Code custom editor already matches `*.json`, so the work is the CLI
`--format` flag, a filename fix, an example file and documentation.

Note packages/core/src/source-name.ts:4 strips `.openapi`/`.asyncapi`/`.openrpc`/`.api`/
`.spec` but **not** `.schema`, so `user.schema.json` currently yields the document id
`user.schema`.

## Checklist

- [x] `--format jsonschema` CLI flag, threaded to ParseOptions
- [x] Strip `.schema` in source-name.ts
- [x] Add examples/*.schema.json
- [x] Update docs/01-overview.md and the README — they name three formats
- [x] Extension test and e2e suite green

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T14:20:00.000Z): Scope is smaller than the checklist implied. Verified by building a real site that the CLI pipeline is already format-agnostic and needs no change to render JSON Schema. Confirmed the `.schema` suffix bug is real: the build emitted the document id `user-profile-schema`, because packages/core/src/source-name.ts:4 strips `.openapi`/`.asyncapi`/`.openrpc`/`.api`/`.spec` but not `.schema`.
- **claude** (2026-09-11T14:20:00.000Z): Added the ViewerShell regression guard to this card, carried from card 25. It must be proven by deletion — remove the `jsonschema` branch, watch the new e2e fail, restore it, watch it pass. The routing chain typechecks clean with an unhandled kind and silently renders the empty-workspace state, so a guard that cannot fail would be worthless here.
- **claude** (2026-09-11T15:00:00.000Z): Done. `--format` added at packages/cli/src/cli.ts with a shared validator at packages/cli/src/format.ts, threaded through config.ts and build.ts to `loadApiDocument`. `.schema` now stripped at packages/core/src/source-name.ts:4, so the build id is `user-profile` rather than `user-profile-schema`. docs/01-overview.md updated to four formats.
- **claude** (2026-09-11T15:00:00.000Z): The regression guard at tests/e2e/jsonschema.spec.ts was proven by deletion, which is the bar for this one: removing the `jsonschema` branch from packages/viewer/src/ViewerShell.svelte made it fail on `getByTestId('jsonschema-document')`, restoring it made it pass. That matters because the routing chain typechecks clean with an unhandled kind and silently falls through to the empty-workspace state, so a guard that could not fail would have been worthless.
- **claude** (2026-09-11T15:00:00.000Z): Verified in the real tree myself — typecheck 10x "0 ERRORS", biome clean, core 89 / ui 148 / e2e 23. Round-trip checked by hand: a schema without `$schema` is correctly rejected, and builds only with `--format jsonschema`; an invalid value fails with "Unknown format: bogus. Expected one of: openapi, asyncapi, jsonrpc, jsonschema."
- **claude** (2026-09-11T15:00:00.000Z): Carried out of scope, not forgotten — package.json `description` and STATUS.md still describe three formats.
