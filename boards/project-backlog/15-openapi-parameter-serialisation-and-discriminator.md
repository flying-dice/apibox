---
column: backlog
labels: [core, ui, openapi]
priority: high
package: core
updatedAt: 2026-09-11T12:00:00.000Z
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

- [ ] Parse parameter `style`/`explode`/`allowReserved`/`allowEmptyValue` into the model
- [ ] Render serialisation info on the parameter row
- [ ] Model `discriminator` (propertyName + mapping) on SchemaNode
- [ ] Render the discriminator mapping in the schema viewer
- [ ] Unit tests in packages/core, renderer tests in packages/ui
