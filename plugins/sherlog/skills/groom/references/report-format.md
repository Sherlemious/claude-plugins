# Report format

## 1. Header

```markdown
## Backlog grooming: {scope}
Tracker: {Linear via <server prefix>} · Open issues scanned: {n} · Stale threshold: {days} days
Proposed actions: {k} ({stale} stale · {dup} duplicate · {related} related · {vague} vague · {label} labels · {fields} fields · {orphan} orphaned)
Skipped buckets: {e.g. "estimate: team does not use estimates" or "none"}
```

## 2. Table

One row per proposed action, numbered from 1 in this order: duplicates, stale, vague, labels, priority/estimate, orphaned. Use the issue's human identifier (e.g. `TLM-123`) linked to its URL.

```markdown
| # | Issue | Title | Bucket | Proposed action | Reason |
|---|---|---|---|---|---|
| 1 | [TLM-42](url) | Login fails on Safari | Duplicate | Mark duplicate of TLM-17 + comment | Same Safari login failure; TLM-17 has repro steps |
| 2 | [TLM-88](url) | Dark mode | Stale | Cancel + comment | Untouched 143 days, backlog, no assignee |
| 3 | [TLM-91](url) | Fix export | Vague | Rewrite description (draft 3 below) | No repro or expected/actual |
| 4 | [TLM-95](url) | Add CSV import | Labels | +Feature | No category label |
```

Rules:
- Titles truncated to ~50 chars.
- "Proposed action" is short and literal, naming the exact status/label/value to set.
- "Reason" is one line with concrete evidence (days, missing sections, matching issue), not a generic phrase.
- Informational items (no write) say `— (info)` in the action column.

## 3. Drafts

For every item that posts a comment or rewrites a description, show the full text under its number:

```markdown
### Draft 3: TLM-91 rewrite
<full proposed description>

### Draft 5: comment on TLM-60
<full comment text>
```

The standard close and duplicate comments from `heuristics.md` do not need a draft section unless they were customized.

## 4. Approval prompt

End with exactly this prompt, adjusted only for counts:

```markdown
Nothing has been changed yet. Reply with the items to apply, e.g. `apply 1-4, 7`, `apply all duplicates`, or `apply all`. You can edit an item first, e.g. `5: use Improvement instead`. Batches are capped at 25 issues.
```

## 5. Apply summary

After applying:

```markdown
## Applied {n} of {approved}
| # | Issue | Result |
|---|---|---|
| 1 | [TLM-42](url) | Marked duplicate of TLM-17, comment posted |
| 4 | [TLM-95](url) | Added Feature |

Failed: {none, or item + error}
Remaining approved but not applied: {none, or list} (batch cap reached; say `continue` to apply)
```
