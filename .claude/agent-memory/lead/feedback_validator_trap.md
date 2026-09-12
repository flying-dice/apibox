---
name: feedback-validator-trap
description: Any change adding or loosening a field on the document model must also update validate.ts, or documents fail silently with a blank viewer
metadata:
  type: feedback
---

When adding a field to the normalised model, or making an existing one optional, update
`packages/core/src/validate.ts` in the same change.

**Why:** this bit four separate times on 2026-09-12. `isApiDocument` asserts on document
shape, so a newly optional or mutually-exclusive field makes a previously valid document fail
validation. The symptom is NOT a failing unit test — the viewer renders "Document is not a
valid normalized API document" and e2e fails with "element(s) not found". Two instances were
identical: `isExample` and the OpenRPC example check both required a `value`/`result` key that
is legitimately absent when its `externalValue` partner is used, because JSON serialisation
drops an absent key entirely.

**How to apply:** put "check validate.ts accepts the new fields" in every brief that touches
`packages/core/src/types.ts`. When a document renders blank or e2e reports missing elements
after a model change, check `isApiDocument` first — it is almost always this.
