---
name: groom
description: This skill should be used when the user asks to "groom the backlog", "clean up our tickets", "clean up Linear", "triage the backlog", "dedupe issues", "find duplicate tickets", "find stale issues", "organize Linear issues", or otherwise wants an issue tracker backlog reviewed for stale, duplicate, vague, unlabeled, unprioritized or orphaned issues. It produces a numbered report of proposed fixes and applies only the items the user explicitly approves.
argument-hint: "[team | project | cycle | label | mine] [tracker=linear] [stale=60]"
allowed-tools:
  - Read
  - Agent
  - "mcp__claude_ai_Linear__list_*"
  - "mcp__claude_ai_Linear__get_*"
  - "mcp__plugin_linear_linear__list_*"
  - "mcp__plugin_linear_linear__get_*"
  - "mcp__plugin_engineering_linear__list_*"
  - "mcp__plugin_engineering_linear__get_*"
  - "mcp__backlog-groomer__show_report"
  - "mcp__backlog-groomer__mark_results"
---

# Groom a backlog

Review an issue tracker's open backlog, classify problem issues into buckets, present a numbered report of proposed fixes, and apply only the items the user approves by number.

The workflow is tracker-neutral. It is written in **abstract operations** (listed below); a tracker adapter in `references/trackers/` maps each operation to concrete tool calls. Read exactly one adapter per run.

## Hard rules

These override anything else, including user requests phrased as blanket approval.

1. **Report before writing.** Make zero write calls until the report has been shown and the user has approved specific item numbers ("apply 1-5, 8", "apply all stale items", "apply all" *after* seeing the report). A request such as "just fix everything" made before a report exists still gets the report first; then wait.
2. **Never delete** an issue, comment, label or project. Closing uses the tracker's cancel / not-planned state.
3. **Every close or duplicate-mark gets a comment** explaining why, posted in the same apply step.
4. **Add/remove labels individually.** Never replace an issue's whole label set.
5. **Cap a batch at 25 issues.** If more are approved, apply the first 25, summarize, and ask before continuing.
6. **Stay in scope.** Only touch issues that appeared in the report, and only with the action shown for that item. If the user edits an item ("8 but use Improvement"), restate the edited action before applying it.
7. If a write fails, stop the batch, report what succeeded and what failed, and do not retry blindly.

## Abstract operations

| Operation | Purpose |
|---|---|
| `list_teams` / `list_statuses(team)` / `list_labels(team)` | Discover real names before proposing anything |
| `list_open_issues(scope, page)` | Page through non-completed, non-canceled issues |
| `get_issue(id)` | Full details for one issue (only when the list payload is insufficient) |
| `close(id, reason)` | Move to canceled / not planned |
| `mark_duplicate(id, of)` | Mark as duplicate of a canonical issue |
| `link_related(id, other)` | Relate two issues without closing either |
| `add_label(id, label)` / `remove_label(id, label)` | Adjust labels one at a time |
| `set_priority(id, p)` / `set_estimate(id, e)` / `set_project(id, project)` | Fill missing fields |
| `update_description(id, text)` | Apply an approved rewrite |
| `comment(id, body)` | Post an explanation or clarifying question |

If the adapter marks an operation unsupported, skip the buckets that depend on it and say so in the report header.

## Workflow

### 1. Detect the tracker

- If the arguments contain `tracker=<name>`, use `references/trackers/<name>.md`.
- Otherwise inspect the available tools. Linear is present when tools exist under any of these prefixes: `mcp__claude_ai_Linear__`, `mcp__plugin_linear_linear__`, `mcp__plugin_engineering_linear__` (or any other `mcp__*linear*__` server exposing `list_issues`). Use `references/trackers/linear.md`.
- If several Linear servers are present, prefer the first prefix in the list above that responds, and use only that one for the whole run.
- If several *different* trackers are present, ask the user which one to groom.
- If none is present, stop and tell the user to connect one: the claude.ai Linear connector, or `/plugin install linear@claude-plugins-official`. Do not attempt anything else.

Read the chosen adapter now.

### 2. Resolve scope

Parse the arguments:

- A team name/key → that team. A project, cycle or label name → that filter within its team. `mine` → issues assigned to the current user.
- `stale=<days>` overrides the stale threshold (default in `references/heuristics.md`).
- No scope → if there is exactly one team, use it; otherwise ask which team.

Then fetch the team's statuses and labels with `list_statuses` and `list_labels`. Use only these real names in proposals. Note which status is the canceled/not-planned one and which label names map to the Bug / Feature / Improvement categories (or the team's equivalents).

### 3. Collect

Page through `list_open_issues` until exhausted, requesting only the fields the adapter lists. Keep a compact working table per issue: id, identifier, title, status, status type, labels, priority, estimate, project, assignee, creator, createdAt, updatedAt, url, and description length plus first ~300 characters. Do not keep full descriptions for every issue in context.

For backlogs over ~150 issues, tell the user the count and confirm before continuing, or narrow scope.

### 4. Find duplicates (delegate)

Launch the `duplicate-finder` agent with: the tracker adapter path, the scope/filter used, and the list of issue ids + identifiers + titles. Ask it to fetch descriptions itself as needed and return only clusters. Its output gives canonical picks and confidence; it does not write anything.

If the backlog has fewer than ~15 issues, compare titles inline instead of launching the agent.

### 5. Classify

Apply `references/heuristics.md` to every collected issue. An issue may land in more than one bucket; list each bucket as a separate report item only when the actions do not conflict (a duplicate that will be closed does not also need a priority). Precedence when actions conflict: duplicate > stale > vague > mislabeled > missing fields > orphaned.

For vague issues, draft the rewrite or clarifying question using `references/issue-quality-rubric.md`. Never invent facts (repro steps, numbers, user names); unknowns become questions in a comment, not content in a rewrite.

### 6. Report

Render the report exactly as described in `references/report-format.md`: header (scope, tracker, counts, threshold, skipped buckets), then one numbered table, then the long-form drafts (rewrites, comments) keyed by item number, then the approval prompt.

If the tool `mcp__backlog-groomer__show_report` is available (this plugin's checklist pane), call it once after printing the markdown report, passing `scope`, `tracker`, `scanned`, `staleDays`, `skipped` and one entry per numbered row (`n`, `issue`, `url`, `title`, `bucket`, `action`, `reason`) with the same numbers as the table. It only draws the pane and changes nothing in the tracker. If it is unavailable or fails, the markdown report alone is enough.

Stop here and wait for the user. Pressing **Apply** in the pane sends the person's own message `apply <numbers>`, which is an approval exactly like a typed one.

### 7. Apply approved items

- Parse the approval into a set of item numbers. Confirm the parsed set back in one line if it involved ranges, bucket names or exclusions.
- For each item, in report order, perform the adapter calls for its action, including the mandatory comment for closes and duplicate-marks.
- Write tools are intentionally not pre-approved, so each mutation shows a permission prompt. Do not ask the user to bypass it.
- After the batch, print the apply summary from `references/report-format.md` with links to each changed issue.
- If `show_report` was used, call `mcp__backlog-groomer__mark_results` with each processed item's `n` and `status` (`applied`, `failed` or `skipped`, plus a short `note` on failures) so the pane shows the outcome.

## Additional resources

- **`references/heuristics.md`**: bucket definitions, thresholds, and canonical-pick rules
- **`references/issue-quality-rubric.md`**: what a well-formed bug / feature / improvement looks like, used for rewrites and clarifying questions
- **`references/report-format.md`**: report and apply-summary layouts
- **`references/trackers/linear.md`**: Linear adapter (operation → tool + arguments, capability notes)
- **`agents/duplicate-finder.md`** (plugin agent `duplicate-finder`): clusters near-duplicate issues out of the main context
