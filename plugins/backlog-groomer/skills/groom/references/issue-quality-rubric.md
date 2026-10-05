# Issue quality rubric

Use this to judge vagueness, to draft rewrites, and to pick clarifying questions. A rewrite **restructures what is already known**; it never adds facts. Anything missing becomes `TBD` in a rewrite or a question in a comment.

## Every issue

- [ ] Title states the problem or outcome in specific terms (component + behavior), ≤ ~80 chars
- [ ] Description explains *why* it matters (who is affected, impact)
- [ ] Scope is a single deliverable; multi-part requests are split or listed as sub-issues
- [ ] Links to relevant context (designs, threads, PRs, logs) are kept

## Bug

- [ ] Steps to reproduce (numbered)
- [ ] Expected behavior
- [ ] Actual behavior (error text, screenshot reference)
- [ ] Environment (platform, browser/app version, account type) when relevant
- [ ] Frequency / severity (always, intermittent; blocking, has workaround)

Rewrite template:

```markdown
## Summary
{one sentence}

## Steps to reproduce
1. {step or TBD}

## Expected
{…}

## Actual
{…}

## Environment
{… or TBD}

## Notes
{original text and links preserved here if not placed above}
```

Clarifying questions (pick the 2–4 most useful):
- What exact steps lead to this? Does it happen every time?
- What did you expect to happen, and what happened instead (exact error text)?
- Which platform/version/account did you see it on?
- Is there a workaround, and who is blocked by this?

## Feature

- [ ] User problem / job to be done ("As a … I want … so that …" or equivalent prose)
- [ ] Proposed behavior at a high level
- [ ] Acceptance criteria (testable bullet list)
- [ ] Out of scope, if ambiguity is likely

Rewrite template:

```markdown
## Problem
{who needs what, and why}

## Proposal
{…}

## Acceptance criteria
- [ ] {criterion or TBD}

## Out of scope
{… or TBD}

## Notes
{original text and links}
```

Clarifying questions:
- Who needs this, and what are they trying to do today?
- What would "done" look like? (2–3 checks we could test)
- Is there anything this should explicitly *not* do?

## Improvement

- [ ] Current behavior and what is wrong with it
- [ ] Desired behavior
- [ ] How success is measured (metric, before/after, user-visible check)

Rewrite template:

```markdown
## Current
{…}

## Desired
{…}

## Success looks like
- {measurable check or TBD}

## Notes
{original text and links}
```

Clarifying questions:
- What specifically is slow/confusing/painful now, and where?
- What would the improved version look like?
- How will we know it's better?
