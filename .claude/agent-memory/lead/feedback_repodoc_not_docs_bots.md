---
name: feedback-repodoc-not-docs-bots
description: Plan work in this repo's existing RepoDoc structure (boards/, decisions/, docs/) — do not create a parallel docs/bots/ roadmap-and-sprint tree
metadata:
  type: feedback
---

Use the repo's existing RepoDoc layout for all planning: cards in
`boards/project-backlog/NN-slug.md`, ADRs in `decisions/NN-slug.md`, docs in `docs/NN-slug.md`.
Do **not** create `docs/bots/ROADMAP.md` or `docs/bots/sprints/`.

**Why:** this repo is already managed by RepoDoc, with a VS Code extension watching those
files and a `.claude/skills/repodoc-workflow` skill describing the conventions. A parallel
planning tree would split the project's memory in two and the user would see stale duplicates.

**How to apply:** when the Lead role calls for a roadmap or sprint file, express it as board
cards and decision records instead. Card `NN` prefixes are a global board position, so create
cards centrally rather than letting parallel subagents allocate numbers and collide.
Card frontmatter needs INLINE list form (`labels: [a, b]`); block-style YAML lists are not parsed.
