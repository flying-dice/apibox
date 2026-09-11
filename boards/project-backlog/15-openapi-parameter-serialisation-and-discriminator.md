---
column: review
labels: [core, ui, openapi]
priority: high
package: core
agent: claude
live: false
status: Serialisation and discriminator parsed and rendered
progress: 100
updatedAt: 2026-09-11T23:20:00.000Z
---
# OpenAPI: parameter serialisation and discriminator

The two highest-impact OpenAPI parse gaps found in the coverage assessment
(docs/06-spec-coverage/01-openapi.md). Both are silent losses — the renderer shows a
plausible-looking page that omits information the document actually declared.

`style`, `explode`, `allowReserved` and `allowEmptyValue` are never read
(packages/core/src/formats/openapi/index.ts:251-273), so a reader cannot tell how an array
or object parameter is actually serialised on the wire. `discriminator` is unmodelled
anywhere in core or ui, so polymorphic `oneOf` schemas lose their mapping.

Verified independently: `grep -rn` for both across packages/core/src and packages/ui/src
returns zero hits.

## Checklist

- [x] Parse parameter `style`/`explode`/`allowReserved`/`allowEmptyValue` into the model
- [x] Render serialisation info on the parameter row
- [x] Model `discriminator` (propertyName + mapping) on SchemaNode
- [x] Render the discriminator mapping in the schema viewer
- [x] Unit tests in packages/core, renderer tests in packages/ui

## Comments

- **claude** (2026-09-11T22:45:00.000Z): Second of the backlog, taken alone because like card 23 it is model-level — `discriminator` belongs on `SchemaNode` (packages/core/src/types.ts), which every renderer reads, so it cannot run beside another card in a shared working tree. Sequenced after 23 for that reason.
- **claude** (2026-09-11T23:20:00.000Z): Landed. `style`/`explode` are stored as `{value, declared}` so the effective serialisation a reader needs is available without pretending an apibox-supplied default was a document assertion — OpenAPI defaults these by location (`form` for query/cookie, `simple` for path/header, `explode` true only under `form`). `allowReserved`/`allowEmptyValue` are recorded only when declared true, since false is behaviourally identical to absence and would earn no screen space. Both fields are optional on `Parameter` because AsyncAPI channel parameters share that type and have no such concept.
- **claude** (2026-09-11T23:20:00.000Z): `discriminator` sits on `SchemaNode`, not on `Composition`, because the spec writes it as a sibling of `oneOf`/`anyOf` rather than inside it — which also covers the rarer allOf-base placement. Mapping targets resolve through the existing component name map, falling back to the raw target rather than dropping the entry.
- **claude** (2026-09-11T23:20:00.000Z): Verified myself — typecheck 10x "0 ERRORS", lint clean over 139 files, core 109 to 117, ui 158 to 165, cli 7, extension 17, e2e 28 (rerun after the shared petstore.yaml fixture gained a discriminated `companion` property and a styled `tags` parameter). Screenshot confirms the density gating actually holds: the array parameter carries `style form` / `explode false` chips while the scalar `limit` and `tag` parameters carry none, and `discriminator species | cat Cat | dog Dog` renders directly above the `oneOf` options it disambiguates.
