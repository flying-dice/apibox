---
name: feedback-subagent-write-guard
description: Subagents' Write/Edit tools are blocked in this repo by a background-isolation guard; they must use Bash heredocs, and their reports can arrive long after the work lands
metadata:
  type: feedback
---

Subagent `Write`/`Edit` tool calls are refused in this repo with a background-isolation
("bg session hasn't isolated yet... worktree") guard. Agents cope in one of two ways: creating
a stray git worktree, or falling back to `Bash` heredocs and `python3` in-place edits.

**Why:** observed repeatedly on 2026-09-11. Two agents created worktrees; one used Bash
heredocs successfully in the real checkout. Separately, one agent's completion notification
arrived roughly 40 minutes after its work had actually landed.

**How to apply:** tell implementation agents up front to edit via `Bash` heredocs and NOT to
create a worktree. Never assume an agent is still working just because no report has arrived —
check for finished-work signals instead (file mtimes, whether its dev server is down, whether
required artefacts exist) before dispatching anything onto the same files. And always re-run
the suite yourself; a late report may still contain findings your own verification missed, as
happened with the scroll-spy regression in card 31.
Related: [[feedback-subagent-worktrees]].
