# Sherlemious Claude Code plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces).

## Add the marketplace

```
/plugin marketplace add Sherlemious/claude-plugins
```

## Plugins

| Plugin | What it does | Install |
|---|---|---|
| [backlog-groomer](plugins/backlog-groomer) | Grooms an issue backlog (stale, duplicate, vague and unlabeled issues), reports proposed fixes, and applies only the ones you approve. Supports Linear. | `/plugin install backlog-groomer@sherlemious` |

## Develop locally

```
claude --plugin-dir ./plugins/backlog-groomer     # load without installing; use /reload-plugins after edits
claude plugin validate ./plugins/backlog-groomer
claude plugin validate .
```

## License

MIT
