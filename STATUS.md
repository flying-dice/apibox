# apibox — status

**Updated:** 2026-09-10 21:02 UTC · **Branch:** `main` · **Working tree:** GitHub delivery pipelines added after initial commit

## Goal / health

Bootstrap a Bun workspace delivering API documentation three ways from one rendering
engine: a VS Code extension, a static site generator, and a GitHub Pages deploy — covering
OpenAPI, AsyncAPI and JSON-RPC. See `docs/01-overview.md`.

**Health: implementation complete; all 13 cards are in Review.** `@apibox/core` parses all three formats.
The UI foundations, OpenAPI renderer, shared browser/VS Code viewer shell, static-site CLI
and extension are implementation-complete. The exact review gate passes clean typecheck,
lint, 239 unit tests and 15 Playwright tests (254 total), with the browser suite rebuilding
every workspace and exercising the CLI-generated static site. The VSIX also packages
cleanly. Every runnable workspace surface has a documented development mode. The
Antigravity review gate was removed at the user's direction.

## Now

Card [11](boards/project-backlog/11-github-pages-deploy-and-release.md) is in **Review**.
The public package contains a bundled CLI and viewer with explicit runtime dependencies;
CI covers Storybook and an isolated lifecycle-free consumer install, the release workflow
refreshes tracked artifacts, and dedicated GitHub workflows deploy the example Pages site
and package or publish the VS Code extension.

Cards [04](boards/project-backlog/04-ui-atoms-and-molecules.md),
[05](boards/project-backlog/05-ui-schema-viewer.md) and
[06](boards/project-backlog/06-ui-openapi-renderer.md) and
[07](boards/project-backlog/07-viewer-spa-shell.md) and
[08](boards/project-backlog/08-cli-static-site-generator.md) and
[09](boards/project-backlog/09-vscode-extension.md) are in **Review** with their test and
clean-code gates satisfied. Card
[10](boards/project-backlog/10-asyncapi-and-jsonrpc-renderers.md) is in **Review**.
AsyncAPI and JSON-RPC use extracted operation/method/message components, the shared schema
catalog and canonical slug helper, with format-level unit and browser coverage.

Card [12](boards/project-backlog/12-development-modes.md) is in **Review**. Root commands
cover the browser viewer, Storybook UI, source CLI, extension watcher and core compiler
watch; VS Code F5 is connected to the extension's background development build.

Card [13](boards/project-backlog/13-full-testid-and-playwright-coverage.md) is in **Review**.
Every production semantic/interactive Svelte element is statically checked for a stable
hook; rendered browser states are checked for missing and duplicate IDs. Playwright covers
every browser-facing workflow and all three supported formats through real CLI output.

## Next

Create the first commit and push it to the selected GitLab project. Then run the literal
`bunx github:flying-dice/apibox` command to verify GitHub transport against the pushed
repository; the equivalent packed clean-consumer path is already green.

## Later

- AsyncAPI and JSON-RPC renderers stay thin this pass — they exist to prove the plugin seam
  (card 10). Depth once OpenAPI is finished.
- Swagger 2.0 input is rejected with a message pointing at `swagger2openapi`. Revisit if
  users hit it.
- No per-page HTML in the generated site. Revisit if SEO becomes a requirement; see
  `decisions/03-cli-ships-a-prebuilt-shell.md`.

## Outcomes / blockers

**Done and verified:**

- Workspace, strict TypeScript, Biome, example specs for all three formats.
- `@apibox/core`: 75 tests green, covering recursive `$ref` cycle detection, path-level
  parameter inheritance, response ordering, both `example` spellings, the Swagger 2.0
  rejection, tuple schemas, multiple composition keywords, closed-vs-unspecified objects,
  partial dereferencing when an external `$ref` is unreachable, `content`-based parameters
  and headers, AsyncAPI 2.6 channel parameters, and OpenRPC `paramStructure`.
- Six decisions recorded in `decisions/`.
- UI foundations, Storybook, atoms, molecules, SchemaViewer, all three renderers and the
  shared viewer shell, static-site CLI and VS Code extension are implemented; workspace
  verification is green at 254 tests, all workspace targets build, and the VSIX packages.
- Full test-ID coverage is enforced from one shared policy at source and browser runtime;
  CI runs the same 239 unit and 15 Playwright scenarios as the local review gate.
- Root release packaging is self-contained across workspace boundaries. A lifecycle-free
  archive installed in an isolated project and generated a valid site through its binary;
  Storybook, release-artifact and Pages workflows are in place.
- All workspace packages expose `dev`; the root provides named commands for every runnable
  surface, and each was smoke-tested through readiness.

**Unresolved:**

- Literal `bunx github:flying-dice/apibox` transport cannot be exercised before the first
  commit/push; the equivalent packed clean-consumer install is verified — see card 11.
- The first local commit is ready; creating the GitLab destination requires an explicit
  project-visibility choice.
- The extension package is built but still needs human sign-off inside an Extension Host.
