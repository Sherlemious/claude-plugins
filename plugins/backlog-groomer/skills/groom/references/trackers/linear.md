# Tracker adapter: Linear

Maps the abstract operations in `SKILL.md` to Linear MCP tools. Tool names below are **bare names**; call them with whichever server prefix was detected (`mcp__claude_ai_Linear__`, `mcp__plugin_linear_linear__`, `mcp__plugin_engineering_linear__`, …). Use one prefix for the entire run.

## Before the first call: check the schema

Linear's MCP server evolves. Before collecting, look at the input schemas of `list_issues` and `save_issue` as exposed in this session and adjust:

- If `save_issue` is absent but `update_issue` / `create_comment` exist, use those (same arguments).
- If `list_issues` has no `fields` parameter, omit it (payloads are just larger).
- If `save_issue` has no `addLabels` / `removeLabels`, fall back to `labels` **only** as `current labels ± the one label`, computed from a fresh `get_issue` immediately before the write. Never pass a set that drops unrelated labels.
- If `duplicateOf` / `relatedTo` are absent, mark duplicates by moving to the canceled status and commenting `Duplicate of {identifier}`; skip `link_related` and list those items as `— (info)`.

Record any fallback in the report header under "Skipped buckets" or as a note.

## Operation mapping

| Abstract op | Linear call | Notes |
|---|---|---|
| `list_teams` | `list_teams()` | |
| `list_statuses(team)` | `list_issue_statuses({ team })` | Each status has a `type`: `triage`, `backlog`, `unstarted`, `started`, `completed`, `canceled` |
| `list_labels(team)` | `list_issue_labels({ team })` | Includes workspace labels; category labels are typically Bug / Feature / Improvement |
| (current user) | `get_user({ query: "me" })` | For the `mine` scope |
| (projects / cycles) | `list_projects({ team })`, `list_cycles({ teamId, type: "current" })` | For scope parsing, orphan matching, cycle exclusion |
| `list_open_issues(scope, page)` | `list_issues({ team, project?, cycle?, label?, assignee?, orderBy: "updatedAt", limit: 100, cursor?, fields? })` | See *Collecting* below |
| `get_issue(id)` | `get_issue({ id })` | Use sparingly |
| (comments, for activity) | `list_comments({ issueId })` | Only for candidates where activity decides the bucket |
| `close(id, reason)` | `save_issue({ id, state: "<canceled status name>" })` then `comment` | Use the team's status of type `canceled` (usually "Canceled") |
| `mark_duplicate(id, of)` | `save_issue({ id, duplicateOf: "<canonical identifier>" })` then `comment` | Linear moves duplicates to the canceled state automatically; do not also set `state` |
| `link_related(id, other)` | `save_issue({ id, relatedTo: ["<other identifier>"] })` | `relatedTo` appends; it does not replace existing relations |
| `add_label(id, label)` | `save_issue({ id, addLabels: ["<label name>"] })` | Never `labels` (replaces the whole set) |
| `remove_label(id, label)` | `save_issue({ id, removeLabels: ["<label name>"] })` | |
| `set_priority(id, p)` | `save_issue({ id, priority: p })` | 0 none, 1 Urgent, 2 High, 3 Medium, 4 Low |
| `set_estimate(id, e)` | `save_issue({ id, estimate: e })` | Use the team's estimate scale as observed on existing issues |
| `set_project(id, project)` | `save_issue({ id, project: "<project name or id>" })` | |
| `update_description(id, text)` | `save_issue({ id, description: "<markdown>" })` | Markdown; preserve original links |
| `comment(id, body)` | `save_comment({ issueId: id, body })` | Mention users as `@displayName` per Linear markdown |

## Collecting

- Request only these fields when `fields` is supported: `id, identifier, title, description, status, statusType, labels, priority, estimate, project, assignee, creator, parent, cycle, dueDate, createdAt, updatedAt, url`.
- Exclude closed work: filter to status types `triage`, `backlog`, `unstarted`, `started`. If the tool takes a `state` filter, call once per type or filter client-side.
- `updatedAt` as a filter means "updated **after**", which is the opposite of what stale detection needs. Instead, order by `updatedAt` and compute staleness client-side from each issue's `updatedAt`.
- Page with `cursor` until there is no next page. Stop and confirm with the user past ~150 issues.

## Capability notes

| Bucket | Supported | Notes |
|---|---|---|
| Stale | Yes | Cancel status + comment |
| Duplicate | Yes | Native `duplicateOf` |
| Related | Yes | Native `relatedTo` |
| Vague | Yes | Description rewrite or comment |
| Labels | Yes | `addLabels` / `removeLabels` |
| Priority | Yes | Native 0–4 |
| Estimate | If enabled | Teams can disable estimates; if no open issue has one, skip the bucket |
| Orphaned | Yes | Projects |

## Gotchas

- Identifiers (`TLM-123`) and UUIDs are both accepted as `id` by most tools; prefer the identifier in reports and UUID in calls if both are present.
- Sub-issues inherit nothing automatically; evaluate them individually but respect the parent exclusion in `heuristics.md`.
- Archived issues are excluded by default; do not include them.
- Rate limits: avoid `get_issue` per issue on large backlogs; the `duplicate-finder` agent fetches descriptions only for candidate pairs.
