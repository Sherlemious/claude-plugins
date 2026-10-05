# backlog-groomer

A Claude Code plugin that grooms your issue backlog. It finds **stale**, **duplicate**, **vague**, **unlabeled/mislabeled**, **unprioritized** and **orphaned** issues, shows a numbered report of proposed fixes, and applies only the items you approve.

Linear is supported today. The workflow is tracker-agnostic: each tracker is a single adapter file under `skills/groom/references/trackers/`.

## Prerequisites

You need **one** Linear MCP connection in Claude Code:

- the **claude.ai Linear connector** (Settings → Connectors on claude.ai, while logged in to the same account), **or**
- the official plugin: `/plugin install linear@claude-plugins-official`, then authenticate when prompted.

This plugin doesn't bundle its own Linear server, so you don't end up with a duplicate set of Linear tools.

## Install

```
/plugin marketplace add Sherlemious/claude-plugins
/plugin install backlog-groomer@sherlemious
```

## Use

Ask in plain language:

> clean up our Linear backlog
> find duplicate tickets in the Mobile project
> groom my issues

Or call the skill directly:

```
/backlog-groomer:groom                     # the only team, or asks which team
/backlog-groomer:groom TheLearningMate     # a team
/backlog-groomer:groom "Q4 Launch"         # a project
/backlog-groomer:groom mine stale=30       # your issues, 30-day stale threshold
```

### What it proposes

| Bucket | Proposed action |
|---|---|
| Stale (not started, untouched for 60+ days) | Cancel, with a comment explaining why |
| Duplicate | Mark as a duplicate of the canonical issue, with a comment, or link as related |
| Vague (no repro steps or acceptance criteria) | A description rewrite, or a comment asking the creator specific questions |
| Unlabeled / mislabeled | Add or remove a Bug / Feature / Improvement label |
| Missing priority / estimate | Propose a value with a reason |
| Orphaned (no project) | Assign an obvious project, or flag the issue as needing a home |

## Safety model

- **It reports first.** Nothing changes until you reply with item numbers, e.g. `apply 1-4, 7`. Even "just fix everything" gets a report first.
- **It never deletes.** Closing uses the Canceled status.
- **Every close or duplicate-mark gets a comment** explaining why.
- **Labels are changed one at a time**, so your other labels are never touched.
- **A batch is capped at 25 issues.**
- **Writes still go through permission prompts.** The skill pre-approves only read-only Linear tools.

## Customize

Edit `skills/groom/references/heuristics.md` to change thresholds and rules, and `issue-quality-rubric.md` to change what a "good issue" looks like.

## Adding a tracker

Copy `skills/groom/references/trackers/linear.md` to `<tracker>.md` and map each abstract operation to that tracker's tools. Mark the operations it can't support. Then add detection for it in `SKILL.md`, and add its read-tool globs to `allowed-tools`.
