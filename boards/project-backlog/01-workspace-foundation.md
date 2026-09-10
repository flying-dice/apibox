---
column: review
labels: [infra]
priority: high
agent: claude
package: root
live: false
updatedAt: 2026-09-10T15:30:00.000Z
---
# Workspace foundation

Stand up the Bun workspace that every other card builds on: root `package.json`
with `workspaces: ["packages/*"]`, a shared strict `tsconfig.base.json`, Biome for
lint and format, `.gitignore`/`.editorconfig`, and the example specs the whole
project is developed against.

The root package doubles as the published CLI package — it carries the `bin`
entry so `bunx github:flying-dice/apibox` resolves. See decisions/03-cli-ships-a-prebuilt-shell.md.

## Checklist

- [x] Root `package.json` with workspaces and `bin`
- [x] `tsconfig.base.json` (strict, bundler resolution)
- [x] Biome config
- [x] `.gitignore`, `.editorconfig`
- [x] Example specs for all three formats
- [ ] CI workflow — moved to card 11, where the release pipeline lives

## Gates

- [x] tests-passing — typecheck, biome and vitest green; 63 tests (claude, 2026-09-10T15:29:00.000Z)
- [x] agy-review — workspace config and example specs reviewed with gemini-3.1-pro-high, sandboxed; two real findings moved to card 11, two disproved, one clean (claude, 2026-09-10T15:29:00.000Z)
- [x] clean-code-review — no marker above 0.5 (claude, 2026-09-10T15:29:00.000Z)

## Comments

- **claude** (2026-09-10T14:26:14.000Z): Created the workspace root — package.json:1-38 declares the `packages/*` workspaces and the `apibox` bin, tsconfig.base.json:1-22 sets strict mode with `noUncheckedIndexedAccess`, and biome.json:1-16 covers lint and format in one tool. Added three example specs to develop against: examples/petstore.yaml:1-203 (OpenAPI 3.1, deliberately includes a recursive `Pet.parent` $ref and a deprecated operation), examples/streetlights.asyncapi.yaml:1-63 and examples/wallet.openrpc.json:1-92. CI workflow still to write.
- **claude** (2026-09-10T14:40:00.000Z): Moved back out of Review. A code-review gate is now required before any card enters Review (boards/project-backlog/.config.json:14-33) and this card had not been through it, so parking it in doing rather than leaving an unearned Review card on the board. The remaining checklist item, the CI workflow, is tracked on card 11 and will be built there.
- **claude** (2026-09-10T15:30:00.000Z): Ran the review gate over the workspace config and example specs — the earlier rounds had only ever looked at packages/core, so this card had not actually earned its gate. Five findings; I verified each rather than accepting them.

  **Two disproved.** It claimed `moduleResolution: "bundler"` would emit extensionless imports and crash Node with `ERR_MODULE_NOT_FOUND`. Every import in the source already carries an explicit `.js` extension, so I built to a scratch directory and confirmed the emitted JS keeps them — no defect. It also claimed Biome does not support `!` negation in `files.includes` and that `.svelte` files would therefore be parsed as JavaScript. That was true of Biome 1.x; 2.x replaced `include`/`ignore` with negatable `includes`. Confirmed empirically by dropping a deliberately malformed JSON file into the excluded `.claude` directory and watching Biome ignore it (biome.json:4-16).

  **One clean:** all three example specs valid and internally consistent, which matches my own check — they parse with zero diagnostics, including from AsyncAPI's own validator.

  **Two real,** both about publishing rather than the workspace itself, so moved to card 11 where the release pipeline lives: the root package declares no runtime `dependencies`, and nothing builds `packages/core/dist` on a `bunx github:` install while that directory is gitignored. Both were already flagged as risks in decisions/03-cli-ships-a-prebuilt-shell.md; they are now concrete checklist items rather than a general warning.
- **claude** (2026-09-10T15:30:00.000Z): Note on the tooling: this review attempted a `write_file` despite an explicit read-only instruction in the prompt and was blocked by `--sandbox`. Worth knowing that the prompt alone is not what keeps a review read-only.
