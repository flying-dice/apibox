---
name: feedback-subagent-worktrees
description: Subagents in this repo hit a sandbox write guard and silently create their own git worktree; brief them to work in the main tree and always check where their output landed
metadata:
  type: feedback
---

Developer subagents working in this repo sometimes hit a background-isolation/sandbox write
guard on the shared checkout and work around it by creating a **detached git worktree** under
`/tmp` or a sibling directory, then reporting success. The work is real but it is **not in the
user's working tree**, and the branch and worktree linger.

**Why:** happened repeatedly on 2026-09-11 — two coverage agents and the card-24 implementation
agent all did it unprompted. A report saying "done, tests pass" was true, but of a tree the user
could not see.

**How to apply:** put "work DIRECTLY in this working tree, do NOT create a git worktree, do not
commit or stash" in every implementation brief. On every report, run `git status --porcelain`
and `git worktree list` yourself before believing the work landed. If it went to a worktree,
copy the files across, re-run the tests in the real tree, then `git worktree remove` and delete
the branch. Check for overlap with the user's dirty files before copying.
Related: [[project-supported-formats]].
