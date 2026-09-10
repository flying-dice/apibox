# Architecture

## The one idea worth knowing

The viewer is built **once** and reused. The same bundle is the VS Code webview and the
static site; only the data source differs.

```
spec files ──[core: load → detect → dereference → normalise]──► ApiDocument (JSON)
                                                                     │
                       ┌─────────────────────────────────────────────┴─────────────────┐
                       ▼                                                               ▼
       webview: correlated host messages                       static site: fetch('./data/<id>.json')
                       └────────────────────────► viewer SPA ◄─────────────────────────┘
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

Because both hosts render the identical bundle, they cannot visually drift apart.

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

**`@apibox/viewer`** is deliberately thin: hash routing, data source selection, layout,
search, scroll-spy.

**`@apibox/cli`** parses specs and copies the prebuilt shell. It never runs a bundler,
which is what keeps a run at roughly a second.

**`packages/extension`** hosts the webview and the commands.

## Related decisions

- `decisions/02-normalised-document-model.md`
- `decisions/03-cli-ships-a-prebuilt-shell.md`
- `decisions/04-vscode-native-theming.md`
