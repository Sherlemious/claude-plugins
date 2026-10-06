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

### Checklist pane (TUI)

In an interactive Claude Code session, the report opens as a **checklist pane**, and the chat shows only a short summary. In fullscreen the pane docks beside the transcript; otherwise it sits above the prompt.

```
▤ TheLearningMate · Linear · 132 scanned · ◷ 60d · ✓ 0/12
[ y: Apply 1 selected ]  [ a: Select shown ]  [ c: Clear ]  [ q: Close ]
≡ All 12  ⧉ Duplicate 3  ◷ Stale 5  ? Vague 2  ◆ Labels 2

[x]  1 ▂▄▆ ▾ TLM-42 ✎ ⧉ Mark duplicate of TLM-17 + comment
    ╭──────────────────────────────────────────────────────────╮
    │ Login fails on Safari                                    │
    │ Priority ▂▄▆ High                                        │
    │ Will do Mark duplicate of TLM-17 + comment               │
    │ Why Same Safari failure; TLM-17 has repro steps          │
    │                                                          │
    │ ✎ Comment to post                                        │
    │ Marking as duplicate of TLM-17, which covers the same …  │
    │ Open in Linear ↗                                         │
    ╰──────────────────────────────────────────────────────────╯
[ ]  2 ··· ▸ TLM-88 ✎ ◷ Cancel + comment
[ ]  3 ▂   ▸ TLM-95   ◆ +Feature
```

- **Click a ticket ID** (or press Enter on it) to expand it in place. It shows the title, current priority, what will happen, why, the exact comment or new description to be posted, and a link to the issue. Only one ticket is open at a time, and clicking the ID again collapses it.
- **Ticking a row also expands it**, so you see what you're approving.
- Drafts longer than 10 lines are cut off until you press **Show all**.
- Icons: priority shows as `!!!` urgent, `▂▄▆` high, `▂▄` medium, `▂` low or `···` none. `✎` marks rows that post text. Buckets are `⧉` duplicate, `⇄` related, `◷` stale, `?` vague, `◆` labels, `▲` priority, `◔` estimate and `○` orphaned.
- `ctrl+x tab` focuses the pane, Tab or the arrow keys move, and `y` applies. Clicking a bucket filters the rows.
- **Apply** sends `apply 1, 4-6` as your message, exactly as if you had typed it. Rows then update to ✓ / ✗ as the writes finish.
- **Show or hide the pane:** `/groom-report` toggles it, and `q` (Hide) closes it. If it gets closed while a report is still active, a one-line band above the prompt shows **▤ Grooming report · N selected · [ g: Show ] [ h: Dismiss ]**, so you can bring it back. Your ticks are kept.

When no pane can be shown (headless runs, older Claude Code versions), the full markdown report is printed in chat instead.

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
