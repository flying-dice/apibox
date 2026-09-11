---
name: feedback-verify-ui-visually
description: Always verify UI changes by building and screenshotting a real site; multiple defects in this project passed the full test suite and were only visible on screen
metadata:
  type: feedback
---

For any UI change, build a real static site and screenshot it before reporting success.
Do not rely on a green suite.

**Why:** on 2026-09-11 three separate defects passed every test. The JSON Schema renderer
printed its description twice and its root `object` row twice — tests asserted the data was
correct and could not tell it was displayed twice. The collapsible item surfaces were far too
heavy for a data-dense design — no test has an opinion on padding. And a scroll-spy regression
survives a fully green 28-test e2e suite because Playwright's default 1280x720 viewport hides
it while 1440x900 exposes it.

**How to apply:** `bun packages/cli/src/dev.ts build examples/<file> --out /tmp/x`, serve it,
then drive Playwright's chromium directly to screenshot and to read computed styles and
`boundingBox()` values. Ask agents for measured numbers rather than adjectives. Remember a
green suite at one viewport says nothing about another.
