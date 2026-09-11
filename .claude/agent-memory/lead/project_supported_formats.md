---
name: project-supported-formats
description: APIBox supports OpenAPI, AsyncAPI and JSON-RPC/OpenRPC; user asked on 2026-09-11 to add standalone general-purpose JSON Schema as a fourth format
metadata:
  type: project
---

APIBox renders three document formats today (OpenAPI, AsyncAPI, JSON-RPC/OpenRPC). On
2026-09-11 the user asked for a **fourth**: standalone general-purpose JSON Schema
documents, e.g. UI form schemas or config schemas — not schemas embedded in an API doc.

**Why:** the user wants APIBox to be useful for schema-only artefacts, widening it beyond
API documentation. This was raised unprompted during a spec-coverage review, so it is a
product direction signal, not a coverage gap.

**How to apply:** treat JSON Schema as a peer format module under
`packages/core/src/formats/`, not a special case of the others. The known hard problem is
detection — the other three formats carry a mandatory root version marker, JSON Schema
does not (`$schema` is optional). Any proposal must state a false-positive story.
Related: [[project-spec-coverage-baseline]].
