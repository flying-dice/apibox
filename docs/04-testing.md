# Testing

## What each layer is tested with

| Layer | Tool | What is asserted |
| --- | --- | --- |
| `@apibox/core` | Vitest | Parsing and normalisation against real spec fixtures |
| `@apibox/ui` | Vitest + `@testing-library/svelte` | Rendering, interaction, both themes |
| `@apibox/viewer` | Vitest | Routing, data sources |
| `@apibox/cli` | Vitest | Output tree of a real build |
| End to end | Playwright | The CLI-generated site, all formats, viewer workflows, failure states and test-ID coverage |

## Query by `data-testid`, always

Every element a test touches carries a `data-testid`, and tests select by it — never by
class name, tag structure, or user-visible text.

```svelte
<button data-testid="schema-node-toggle" onclick={toggle}>…</button>
```

```ts
expect(getByTestId('schema-node-toggle')).toBeInTheDocument();
```

The reason is specific to this project: the entire UI is themed through CSS variables, and
much of it renders spec-supplied text. Selecting by class couples tests to the token layer,
so a theming change breaks unrelated tests. Selecting by text couples tests to fixture
content, so editing `examples/petstore.yaml` breaks them. A `data-testid` is the only
selector that is stable against both.

The contract covers component roots, meaningful states, repeated data items, semantic
containers and every interactive element. Production Svelte is checked statically, and
the browser suite checks the rendered document for missing hooks and duplicate values.

Naming: `<component>-<element>`, kebab-case, e.g. `parameter-table-row`,
`operation-card-method`, `sidebar-nav-item`. Where a list renders many of the same thing,
suffix the identifying value: `sidebar-nav-item-listpets`.

## Fixtures

Spec fixtures live in `examples/` when they are also useful as demonstrations, and in
`packages/core/test/fixtures/` when they exist only to exercise an edge case — a recursive
`$ref`, a Swagger 2.0 document that must be rejected, a spec with no paths.

`examples/petstore.yaml` deliberately contains a recursive `Pet.parent`, a deprecated
operation, an operation with `security: []`, and both spellings of `example`, so the
happy-path tests cover the cases that actually break renderers.

## Running

```sh
bunx playwright install chromium # once per development machine
bun run test:unit    # every package's Vitest suite
bun run test:e2e     # build, serve and test the CLI-generated site
bun run test         # unit and browser suites
bun run typecheck
bun run lint
```

The browser suite generates one static site from every example format through the real
CLI, serves that output locally, and runs against Chromium. It covers routing, document
navigation, filtering, keyboard clearing, theme changes, deep links, copying, schema
expansion, loading and invalid-data states, plus OpenAPI, AsyncAPI and JSON-RPC content.

## Before a card enters Review

The board gates it. See `boards/project-backlog/.config.json`:

1. `bun run typecheck && bun run lint && bun run test` green.
2. No `TODO: clean-code` marker scoring above 0.5.

Record the evidence under the card's `## Gates` heading. A human moves a card from Review
to Done.
