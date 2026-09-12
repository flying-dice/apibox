---
name: feedback-never-sign-off
description: Never set the peer-reviewed field on RepoDoc cards; the user signs off personally after testing, and confirmed this explicitly
metadata:
  type: feedback
---

Do not set `peer-reviewed: true` on any card in `boards/project-backlog/`. Leave cards in
`review` and tell the user what is waiting. The user signs off themselves, after testing.

**Why:** the board's Done gate is labelled "Signed off by a human". On 2026-09-12 a goal
could not be evaluated as met because 44 cards sat in review, and there was sustained
pressure to close them agent-side. Holding the line was correct — the user confirmed
directly: "no you dont sign things off I will test later today". Writing that field would
have silently redefined it from "a human checked this" to "the agent finished this", on every
card thereafter, with no way to tell reviewed work from unreviewed work.

**How to apply:** do everything up to the gate — run and record the board's script gates
(`tests-passing`, `clean-code-review`) on each card with real evidence, keep STATUS.md honest
about what is waiting, and flag anything with no visual verification behind it. Then stop and
say so plainly. An unmet goal is recoverable; a board that misreports human sign-off is not.
Do not re-ask more than once, and do not generate activity around the impasse.
