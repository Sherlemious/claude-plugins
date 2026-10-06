# Sherlog

Sherlog investigates your issue backlog like a detective. It finds **stale**, **duplicate**, **vague**, **unlabeled/mislabeled**, **unprioritized** and **orphaned** issues, shows a numbered report of proposed fixes, and applies only the items you approve.

Linear is supported today. The workflow is tracker-agnostic: each tracker is a single adapter file under `skills/groom/references/trackers/`.

## Prerequisites

You need **one** Linear MCP connection in Claude Code:

- the **claude.ai Linear connector** (Settings → Connectors on claude.ai, while logged in to the same account), **or**
- the official plugin: `/plugin install linear@claude-plugins-official`, then authenticate when prompted.

This plugin doesn't bundle its own Linear server, so you don't end up with a duplicate set of Linear tools.

## Install

```
/plugin marketplace add Sherlemious/claude-plugins
/plugin install sherlog@sherlemious
```

## Use

Ask in plain language:

> clean up our Linear backlog
> find duplicate tickets in the Mobile project
> groom my issues

Or call the skill directly:

```
/sherlog:groom                     # the only team, or asks which team
/sherlog:groom TheLearningMate     # a team
/sherlog:groom "Q4 Launch"         # a project
/sherlog:groom mine stale=30       # your issues, 30-day stale threshold
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

## What this plugin reads, runs and sends

- **No servers, network calls or credentials of its own.** The plugin bundles no MCP server, makes no HTTP requests, runs no package installs or shell scripts, and asks for no API keys. Its only external access is through the Linear connection you already have (the claude.ai Linear connector or `linear@claude-plugins-official`), with your account's permissions.
- **What it reads from Linear:** your teams, workflow statuses, labels, projects and cycles, the current user (for the `mine` scope), and the open issues in the scope you choose. That includes their titles, descriptions, status, labels, priority, estimate, assignee, creator, dates and URLs. Comments are read only for candidate issues. The read-only `list_*` and `get_*` Linear tools are pre-approved while the skill runs, so these reads don't prompt.
- **What it writes to Linear**, and only for the items you approve by number: status changes to Canceled, duplicate and related links, label additions and removals, priority, estimate and project, description rewrites, and comments. Every write goes through Claude Code's normal permission prompt. Nothing is ever deleted.
- **What it stores:** only the current report, which items you've ticked and the apply results. These are held in Claude Code's session state for the checklist pane, are never written to disk, and are gone when the session ends.
- **The checklist pane** is the hooks module `hooks/register.tsx`, readable TypeScript that Claude Code loads. [What the hooks do](#what-the-hooks-do) lists each hook.
- **No telemetry.** Issue data goes nowhere except the Claude conversation you run the skill in and the Linear workspace it came from.

The skill and agent are plain Markdown. The pane is a Claude Code feature; on surfaces without panes, the skill prints the same report in chat.

### What the hooks do

`hooks/hooks.json` loads one module, `hooks/register.tsx`, which registers these hooks. None of them makes network requests, reads or writes files, or runs processes.

| Hook | What it does |
|---|---|
| `session.start` | Registers the two pane tools below and the `/groom-report` command, then continues the session normally. |
| `tool.call` for `mcp__sherlog__show_report` | Serves this plugin's own tool. It stores the report the skill passes in, resets ticks and results, and opens the pane. It answers with whether the pane opened, so the skill knows to keep the chat short or print the full report. |
| `tool.call` for `mcp__sherlog__mark_results` | Serves this plugin's own tool. It records each item as applied, failed or skipped so the pane shows ✓ / ✗ / –. |
| `command.run` for `/groom-report` | Shows the pane if it's hidden, or hides it if it's shown. |
| `ui.close` for the `groom-report` pane | Notes that the pane was closed, by its close mark, Esc or **Hide**, then lets the close go through unchanged. |
| `ui.render` for the `groom-report` pane | Draws the checklist pane: header, buttons, bucket filters, rows and the expanded ticket. |
| `ui.render` above the prompt | When a report is active and the pane is closed, draws the one-line band with **Show** and **Dismiss**. Otherwise it leaves the area above the prompt untouched. |

**Tools.** The module only answers calls to the two tools it registers itself, `mcp__sherlog__show_report` and `mcp__sherlog__mark_results`. It doesn't intercept, replace or change any other tool, and Linear reads and writes go straight to your Linear connection.

**Prompts it submits.** The module submits exactly one kind of prompt: `apply <item numbers>`, for example `apply 1-3, 7`. It does so only when you press **Apply** with at least one row ticked, and at most 25 items at a time. The prompt is submitted as your own message, and it is the same text you would type to approve those items. The module never submits anything else, adds no hidden context, and doesn't change the system prompt.

## Customize

Edit `skills/groom/references/heuristics.md` to change thresholds and rules, and `issue-quality-rubric.md` to change what a "good issue" looks like.

## Adding a tracker

Copy `skills/groom/references/trackers/linear.md` to `<tracker>.md` and map each abstract operation to that tracker's tools. Mark the operations it can't support. Then add detection for it in `SKILL.md`, and add its read-tool globs to `allowed-tools`.
