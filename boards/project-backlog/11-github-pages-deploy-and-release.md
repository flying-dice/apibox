---
column: review
labels: [infra, cli]
priority: med
package: root
agent: codex
live: false
updatedAt: 2026-09-10T21:02:00.000Z
---
# GitHub Pages deploy and release pipeline

Two related pieces of plumbing. The deploy command scaffolds a Pages workflow rather
than pushing a `gh-pages` branch from the user's machine — no local git surgery, no
credential handling in the extension, and the site rebuilds whenever specs change.
See decisions/06-deploy-via-github-actions.md.

The release workflow builds the viewer and commits `packages/cli/assets/viewer/` back to
the default branch, because `bunx github:` cannot be relied on to run a `prepare` script
for a workspace root. This is the most likely thing in the whole plan to misbehave, so
it needs verifying for real against a pushed branch.

## Checklist

- [x] Root `package.json` declares the runtime `dependencies` the CLI needs (`yaml`,
      `@apidevtools/json-schema-ref-parser`, `@asyncapi/parser`). It currently declares none,
      so a consumer installing the root package gets a CLI that cannot resolve its imports.
- [x] Ensure `packages/core/dist` exists for a consumer. It is gitignored and no `prepare`
      script builds it, so a `bunx github:` install has nothing to run. Either commit the
      build alongside the viewer assets, or point the package at source and bundle.
- [x] `.github/workflows/ci.yml` — typecheck, lint, test, build, Storybook
- [x] `.github/workflows/release.yml` — build viewer, commit prebuilt assets
- [x] Pages workflow template emitted by the deploy command
- [x] Repository Pages workflow builds and deploys the checked-in examples
- [x] VS Code extension workflow packages a VSIX on changes and publishes it on a GitHub release
- [ ] Verified: `bunx github:flying-dice/apibox build ./spec.yaml` on a clean machine — literal GitHub transport requires the first commit and push; the lifecycle-free packed artifact passed the equivalent isolated-consumer test

## Gates

- [x] tests-passing — exact board gate passed: clean typecheck/lint, 235 unit tests and 15 Playwright tests; workspace and bundled CLI builds ran through the browser fixture (codex, 2026-09-10T19:39:18Z)
- [x] clean-code-review — full parallel review resolved archive-boundary, redundant-build, dependency-drift, version-drift and naming findings; final re-review clean above 0.5 (codex, 2026-09-10T19:39:18Z)
- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **codex** (2026-09-10T19:15:00.000Z): Claimed the final non-Review card. The Pages scaffold already exists in packages/extension/src/workflow.ts:1 and has unit coverage in packages/extension/src/extension.test.ts:35; CI exists at .github/workflows/ci.yml:1 but still needs Storybook. Closing the root runtime dependency and core distribution gaps, then adding release automation and a clean-consumer verification path.
- **codex** (2026-09-10T19:39:18.000Z): Made the root package consumable at package.json:12-27 and package.json:55-59, with workspace core bundled by scripts/bundle-cli.mjs:4-41 and explicit runtime externals derived from package metadata. Added isolated lifecycle-free installation and CLI execution at scripts/verify-package.mjs:15-50, now enforced by .github/workflows/ci.yml:37-44 alongside Storybook. Added artifact refresh automation at .github/workflows/release.yml:1-49, updated the generated Pages action sequence at packages/extension/src/workflow.ts:25-39, and documented operation at docs/05-deployment-and-release.md:1-37. The packed archive installed 168 production packages and generated a valid site. Literal `bunx github:` transport remains a first-push review check because this checkout has no HEAD or remote.
- **codex** (2026-09-10T21:02:00.000Z): Added first-party GitHub Actions pipelines for the example documentation site and VS Code extension. Pages builds from the checked-in source and deploys through the protected `github-pages` environment; the extension packages a retained VSIX for changes and publishes that same artifact from GitHub releases through the `vscode-marketplace` environment.
