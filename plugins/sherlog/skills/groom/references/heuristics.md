# Grooming heuristics

Rules for assigning issues to buckets. Each bucket lists **signals**, **exclusions** (never flag), and the **proposed action**. When in doubt, do not flag: a short, accurate report beats a long noisy one.

## Global exclusions

Never propose any action for an issue that:

- is in a started / in-progress / in-review status (status type `started`), except for missing labels/priority/estimate
- was created in the last 7 days (the author is likely still shaping it)
- is a parent issue with open sub-issues, except for missing labels/priority
- carries a label or title marker such as `keep`, `pinned`, `epic`, `tracking`, `do-not-close` (case-insensitive)

## Stale

**Signals:** status type is `backlog`, `unstarted` or `triage`, **and** `updatedAt` is older than the threshold (default **60 days**, override with `stale=<days>`).

**Strengthening signals** (mention in the reason): no assignee, no project, no priority, no comments, created more than 2× the threshold ago.

**Exclusions:** priority Urgent or High; in an active or upcoming cycle; has a due date in the future.

**Action:** `close(id, reason)` → canceled / not-planned status, with comment:

> Closing as stale: no activity for {N} days and not started. Reopen if this is still relevant; a fresh comment with current context helps it get picked up.

If the issue is old but has priority Medium or a project, propose a **comment asking the assignee/creator to confirm** instead of closing.

## Duplicate

Source: clusters returned by the `duplicate-finder` agent (or the inline title comparison for small backlogs).

**Signals (high confidence):** same user-facing problem or request, described with overlapping key nouns/verbs, same component or screen, compatible repro steps. Titles that are near-identical after normalization (lowercase, strip punctuation, strip prefixes like `[Bug]`, `Bug:`) count as high confidence.

**Medium confidence:** same area and similar intent but different scope or detail. Propose `link_related`, not a duplicate-mark.

**Canonical pick** (first rule that decides):

1. The issue that is started or has more activity (comments, linked PRs)
2. The issue with the more complete description per the rubric
3. The older issue

**Action (high):** `mark_duplicate(id, of=canonical)` with comment:

> Marking as duplicate of {canonical identifier}, which covers the same {problem/request}. Any extra detail from this issue: {one-line summary or "none"}.

If the duplicate has details the canonical lacks, add a separate report item proposing a `comment` on the canonical that carries them over.

**Action (medium):** `link_related(id, other)`. No comment needed.

## Vague

**Signals** (two or more, or the first alone):

- empty description, or description under ~80 characters that adds nothing beyond the title
- Bug without repro steps, expected vs actual behavior, or environment
- Feature/Improvement without a stated user problem or acceptance criteria
- title is a single generic word or phrase ("Fix", "Login", "Improve performance", "Bug")

**Action:**

- If the title + description + comments contain enough facts to restructure, propose `update_description` with a rewrite following `issue-quality-rubric.md`. Preserve every original fact and link; mark gaps as `TBD` rather than inventing content.
- Otherwise propose a `comment` that @mentions the creator with 2–4 specific questions taken from the rubric's checklist for that issue type.

## Mislabeled / unlabeled

**Unlabeled signal:** none of the team's category labels (e.g. Bug / Feature / Improvement) is set.

**Mislabeled signal:** the content clearly contradicts the label, e.g. labeled Feature but describes existing behavior that is broken (→ Bug); labeled Bug but asks for new behavior that never existed (→ Feature); labeled Feature but tweaks an existing flow (→ Improvement).

**Classification guide:**

- **Bug:** existing behavior is wrong, broken, crashes, regressed, or contradicts spec
- **Feature:** a capability that does not exist yet
- **Improvement:** an existing capability works but should be better (UX, performance, copy, refactor, DX)

**Action:** `add_label` for the correct category, plus `remove_label` for a contradicting one. Never remove non-category labels. Use only label names fetched from the team.

## Missing priority / estimate

**Signals:** priority is "No priority" (0) or estimate is empty on an unstarted issue, **and** the team actually uses the field. Treat a field as used when at least ~30% of the team's open issues set it; otherwise skip the bucket and say so in the report header.

**Action:** `set_priority` / `set_estimate` with a proposed value and a one-line rationale. Priority hints: user-facing breakage or data loss → High; Bug with workaround → Medium; Feature/Improvement without urgency → Low. Estimate: use the team's scale; size from description scope, and prefer leaving it out of the report over guessing on vague issues (fix vagueness first).

## Orphaned

**Signals:** no project, while the team has active projects and at least ~50% of open issues belong to one.

**Action:** `set_project` only when one project is an obvious match by name/description; otherwise list it as a "needs a home" item with the top 1–2 candidate projects and no write action (informational).
