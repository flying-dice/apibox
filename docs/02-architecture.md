# Architecture

## The one idea worth knowing

The documentation experience is an **Inner App** mounted by three different hosts. It is
built from the same Svelte components and only its data source differs. Workspace and file
ownership belongs to the **Outer App**, when there is one.

```
spec files ──[core: load → detect → dereference → normalise]──► ApiDocument (JSON)
                                                                     │
                       ┌──────────────────────────┬────────────────────────────────────┐
                       ▼                          ▼                                    ▼
            VS Code Outer App          no Outer App (CLI site)            browser PWA Outer App
           host message source            static JSON source             IndexedDB workspace source
                       └──────────────────────────┴────────────────────────────────────┘
                                                  │
                         Inner App: navigation + schema/document viewer
                                                  │
                                         @apibox/ui renderers
```

The viewer depends on an interface, not on either host:

```ts
export interface DataSource {
  loadManifest(): Promise<Manifest>;
  loadDocument(id: string): Promise<ApiDocument>;
}
```

### Host responsibilities

- **CLI:** emits the publishable Inner App only. There is no workspace manager, browser
  storage or installation chrome in somebody's generated documentation site.
- **VS Code:** Visual Studio Code is the Outer App. It owns the workspace and files; the
  extension mounts the Inner App and provides documents through correlated webview
  messages.
- **GitHub Pages:** the installable APIBox PWA is the Outer App. It owns named browser
  workspaces in IndexedDB, file imports and deletion; it embeds the same Inner App for the
  active workspace.

Because every host mounts the same Inner App, documentation navigation and rendering
cannot visually drift apart. Outer Apps may differ because they adapt to their host's
native workspace model.

## Layers

**`@apibox/core`** owns everything that touches a specification. It detects the format
from the document's own version marker rather than the filename, dereferences `$ref`s,
and normalises the result into `ApiDocument`. The UI never sees a raw spec object.

All three formats describe their payloads with JSON Schema, so they normalise into one
shared `SchemaNode` tree — which is why one `SchemaViewer` serves all three.

Dereferencing recursive schemas produces genuinely cyclic object graphs. The schema
walker tracks ancestors by object identity and emits a `circularRef` marker rather than
descending; renderers must honour that marker or they will recurse forever.

**`@apibox/ui`** holds every visual component, organised by atomic design, including the
whole-document renderers. Nothing visual lives in the viewer app, so everything is
reachable from Storybook.

**`@apibox/viewer`** contains the thin Inner App — hash routing, data source selection,
layout, search and scroll-spy — plus the GitHub Pages-only PWA Outer App and its browser
workspace adapter. The two are separate build targets.

**`@apibox/cli`** parses specs and copies the prebuilt shell. It never runs a bundler,
which is what keeps a run at roughly a second.

**`packages/extension`** hosts the webview and the commands.

## Related decisions

- `decisions/02-normalised-document-model.md`
- `decisions/03-cli-ships-a-prebuilt-shell.md`
- `decisions/04-vscode-native-theming.md`
- `decisions/07-local-first-browser-workspaces.md`
