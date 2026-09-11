---
column: backlog
labels: [core, asyncapi]
priority: low
package: core
updatedAt: 2026-09-11T12:00:00.000Z
---
# AsyncAPI: remaining metadata and dereference parity

Low-severity unmodelled AsyncAPI constructs (docs/06-spec-coverage/02-asyncapi.md):
`correlationId`, Info `externalDocs`/`termsOfService`, License `url`,
`defaultContentType`, Tag `externalDocs`, channel `servers`/`tags`, and the components
catalogues (messages, parameters, correlationIds, replies, traits) as browsable lists.

Also flagged, unconfirmed: AsyncAPI dereferencing bypasses the shared
`dereferenceDocument` warning machinery that OpenAPI and OpenRPC use, so unresolved-ref
warning parity is unverified. Confirm before assuming it is a bug.

## Checklist

- [ ] Verify dereference warning parity with the other two formats
- [ ] Parse and render the listed metadata fields
- [ ] Components catalogues as browsable lists
