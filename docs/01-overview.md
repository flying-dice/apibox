# apibox

apibox renders OpenAPI, AsyncAPI, JSON-RPC and JSON Schema documentation three ways,
from one rendering engine:

1. **In VS Code** — open a spec file and read it as documentation, styled with your own
   colour theme, updating as you edit.
2. **As a static site** — build the publishable documentation viewer from a set of specs,
   either from a VS Code command or with `bunx github:flying-dice/apibox`.
3. **On GitHub Pages** — use the installable local-first workspace, or deploy a generated
   documentation site from a VS Code command.

Every pixel is our own Svelte. Nothing is embedded from Redoc, Scalar, Swagger UI or
`@asyncapi/react-component` — see `decisions/01-own-renderers-not-embeds.md`.

## Inner app and outer app

APIBox deliberately separates the documentation experience from whichever product hosts
it:

| Surface | Outer app | Inner app |
| --- | --- | --- |
| CLI output | None — the result is directly publishable | API navigation and schema/document viewer |
| VS Code extension | Visual Studio Code and its workspace/file UI | API navigation and schema/document viewer mounted in a webview |
| APIBox GitHub Pages | Installable PWA with browser-local workspace management | API navigation and schema/document viewer embedded in the PWA |

The **Inner App** owns API-document navigation, search, deep links and all schema and
format renderers. The **Outer App** owns files and workspaces. This is why a CLI build is
a clean documentation site, while the APIBox Pages application can create and delete
workspaces, import files and retain them in the browser without changing the renderer.

## Repository layout

```
packages/
├── core/       @apibox/core   — parse, dereference, normalise → ApiDocument
├── ui/         @apibox/ui     — Svelte component library + Storybook + themes
├── viewer/     @apibox/viewer — Svelte + Vite SPA shell
├── cli/        @apibox/cli    — specs in, static site out
└── extension/  apibox-vscode  — custom editor and commands
examples/       specs used throughout development
```

## Getting started

```sh
bun install
bunx playwright install chromium # one-time browser setup
bun run dev           # browser viewer (default development surface)
bun run test          # unit and Playwright browser suites
bun run typecheck
```

## Development modes

Every workspace unit has a local `dev` script. From the repository root, use the named
commands below:

| Command | Development surface |
| --- | --- |
| `bun run dev` or `bun run dev:viewer` | Browser viewer with Vite hot reload |
| `bun run dev:ui` | Component library in Storybook |
| `bun run dev:cli -- --help` | CLI directly from TypeScript source; replace `--help` with any CLI arguments |
| `bun run dev:extension` | Build/watch the extension, then launch an isolated VS Code window on `examples/` with only APIBox loaded |
| `bun run dev:core` | Core library TypeScript compiler in watch mode |

`bun run dev:cli -- build ...` rebuilds the viewer shell from source first and builds the
site around that, so a local change to `@apibox/ui` or `@apibox/viewer` shows up immediately.
A published CLI run instead copies the shell committed to `packages/cli/assets/viewer` — see
`decisions/03-cli-ships-a-prebuilt-shell.md` — and that directory is written only by CI, so
it lags behind your working copy. Pass `--asset-dir` to build around a shell you have already
built yourself.

The extension command opens `examples/` directly in a dedicated Extension Development
Host with isolated user-data and extension directories, so APIBox is the only non-builtin
extension loaded. Pressing F5 uses the same examples workspace and starts only the watcher
because VS Code itself owns that launch. The viewer also exposes
`bun run --cwd packages/viewer dev:webview` when the VS Code-targeted shell needs to be
served directly.

Supported `.yaml`, `.yml` and `.json` files expose **APIBox: Preview API Document** in
both the Explorer and editor context menus. The selected file is passed directly to the
extension, so it does not have to be the active text editor.

The APIBox activity bar rail lists every detected document in the workspace, grouped by
format, so you don't have to already know which file it is. Selecting one opens the same
preview. Detection is content-based — the same `detectFormat` used everywhere else — so
unrelated JSON/YAML like `package.json` never appears; `apibox.include` and `apibox.exclude`
narrow the scan in a large monorepo.
