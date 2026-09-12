---
column: review
labels: [viewer, ui]
priority: high
package: viewer
agent: claude
live: false
status: Heuristic replaced with live geometry
progress: 100
updatedAt: 2026-09-11T18:40:00.000Z
---
# Scroll-spy stops advancing on short documents

`createSectionTracker` (packages/viewer/src/section-tracker.ts) selects the active section
with `rootMargin: '0px 0px -70% 0px'` and takes the topmost intersecting element. That
heuristic assumes each section has roughly a viewport of scroll room in which to cross the
threshold band.

Card 29 collapsed every item by default, which shrank total document height sharply. At
1440x900 the later Petstore operations (`getpet`, `deletepet`, `getinventory`) never reach the
band before the document runs out of scroll, so the sidebar's highlighted item stops advancing
partway down the page.

**The e2e suite does not catch this.** Playwright's default viewport is 1280x720, where only
the final item misbehaves — an edge case that predates card 29 and was visible even with
everything expanded. All 28 e2e tests pass with the bug present. Any fix needs a guard that
runs at a viewport tall enough to expose it.

Found and reported by the card 29 implementing agent, which correctly declined to retune the
heuristic outside its brief.

## Options

- Adaptive `rootMargin` computed from document height against viewport height.
- Fall back to "nearest heading above the scroll position" instead of "topmost intersecting",
  which degrades sensibly when everything fits on one screen.
- Track scroll position directly rather than via IntersectionObserver.

## Checklist

- [x] Reproduce at 1440x900 with a collapsed Petstore, as a failing test first
- [x] Choose an approach and record why
- [x] Confirm the last item in a document can become current
- [x] Verify at several viewport heights, not just Playwright's default

## Gates

- [x] tests-passing — typecheck 10x "0 ERRORS", biome clean over 148 files, core 211, ui 226, cli 7, extension 17, viewer 20, e2e 28 (claude, 2026-09-12T12:30:00.000Z)
- [x] clean-code-review — marker scan reports zero findings above 0.5 (claude, 2026-09-12T12:30:00.000Z)
- [ ] peer-reviewed — NOT SET. Requires a human; deliberately left for the user.

## Comments

- **claude** (2026-09-11T18:40:00.000Z): Forced forward by card 30 rather than scheduled — flattening shrank documents further and turned this latent bug into a failing e2e test. Fixed in packages/viewer/src/section-tracker.ts by dropping the "topmost intersecting entry within a -70% band" rule for live geometry: the active section is the last one whose top has passed a line at 30% of the viewport, with the final section winning outright at the bottom of the page. The IntersectionObserver is kept as a cheap trigger and paired with a passive, frame-coalesced scroll listener, because a document that fits on one screen never crosses anything.
- **claude** (2026-09-11T18:40:00.000Z): Two edge cases found by the tests, both real bugs rather than test artefacts. Emitting a section at scroll top rewrote a freshly opened `#/petstore` into `#/petstore/<first-section>`; and on a document with no scroll room at all the tracker immediately overruled a section the reader had just clicked. Both now guarded: no current section at the top of a scrollable document, and no opinion at all when there is nothing to scroll. `onSectionChange` was widened to `string | undefined` so the highlight releases on the way back up instead of latching — `currentSection` and the router's `sectionId` were already optional.
- **claude** (2026-09-11T18:40:00.000Z): Measured limitation worth knowing. With every item collapsed the Petstore fixture is 1442px against a 720px viewport, so its whole operation list sits inside the last few hundred pixels: an item like `createpet` would need 807px of scroll against a 722px maximum and can never become current by scrolling. Scroll position simply cannot separate the middle sections of a short document. The rewritten guard at tests/e2e/viewer.spec.ts asserts what must hold instead — the final section becomes current at the bottom, which was impossible before, and releases at the top.
