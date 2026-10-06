# Sherlog privacy policy

_Effective 6 October 2026_

Sherlog is an open-source Claude Code plugin published by Sherlemious (github.com/Sherlemious). This policy explains what happens to data when you use it.

## The short version

Sherlog doesn't collect, store or send your data anywhere. It has no servers, no analytics and no telemetry, and its author never receives anything from your use of it.

## What Sherlog accesses

Sherlog runs inside your own Claude session. It works only through the issue-tracker connection you have already set up in Claude, such as the claude.ai Linear connector or the `linear@claude-plugins-official` plugin, and it acts with that connection's permissions.

- **It reads** your teams, workflow statuses, labels, projects and cycles, your own user record (for the `mine` scope), and the open issues in the scope you choose. That includes their titles, descriptions, status, labels, priority, estimate, assignee, creator, dates, URLs and, for some issues, comments. This can include people's names.
- **It writes** only the changes you approve by item number: status changes, duplicate and related links, labels, priority, estimate, project, description rewrites and comments.

## Where that data goes

- **To Claude**, as part of the conversation in which you run the skill. Anthropic's policies for your Claude account cover that conversation.
- **Back to your issue tracker**, for the changes you approve. Your tracker's own policies cover that data.
- **Nowhere else.** Sherlog makes no network requests of its own and has no connection to any service run by its author.

## What Sherlog stores

While a session is open, the checklist pane keeps the current report, which rows you have ticked and the results of applied changes in Claude Code's session state. Nothing is written to disk by Sherlog, and this state is discarded when the session ends.

## Children

Sherlog is a developer tool and isn't directed at anyone under 18.

## Changes

Changes to this policy are published in this file, with the full history in the repository's git log.

## Contact

Open an issue at https://github.com/Sherlemious/claude-plugins/issues.
