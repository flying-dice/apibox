# apibox

apibox renders OpenAPI, AsyncAPI and JSON-RPC documentation three ways, from one
rendering engine:

1. **In VS Code** — open a spec file and read it as documentation, styled with your own
   colour theme, updating as you edit.
2. **As a static site** — build a deployable site from a set of specs, either from a VS
   Code command or with `bunx github:flying-dice/apibox`.
3. **On GitHub Pages** — deploy that site from a VS Code command.

Every pixel is our own Svelte. Nothing is embedded from Redoc, Scalar, Swagger UI or
`@asyncapi/react-component` — see `decisions/01-own-renderers-not-embeds.md`.

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
| `bun run dev:extension` | Rebuild webview assets, then watch the VS Code extension bundle |
| `bun run dev:core` | Core library TypeScript compiler in watch mode |

Press F5 in VS Code to start an Extension Development Host. Its launch configuration uses
the extension development mode automatically. The viewer also exposes
`bun run --cwd packages/viewer dev:webview` when the VS Code-targeted shell needs to be
served directly.
