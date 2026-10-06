# Sherlemious Claude Code plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces).

## Add the marketplace

```
/plugin marketplace add Sherlemious/claude-plugins
```

## Plugins

| Plugin | What it does | Install |
|---|---|---|
| [sherlog](plugins/sherlog) | Grooms an issue backlog (stale, duplicate, vague and unlabeled issues), reports proposed fixes, and applies only the ones you approve. Supports Linear. | `/plugin install sherlog@sherlemious` |

## Develop locally

```
claude --plugin-dir ./plugins/sherlog     # load without installing; use /reload-plugins after edits
claude plugin validate ./plugins/sherlog
claude plugin validate .
```

## License

MIT
