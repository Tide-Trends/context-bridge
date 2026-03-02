# 🔌 Context Bridge

**Share context between AI coding tools.** One SQLite database, every tool in sync.

Works with **Cursor**, **VS Code (Copilot)**, **Antigravity**, and **OpenCode** — or any tool that supports [MCP](https://modelcontextprotocol.io).

## What it does

When you work with multiple AI coding assistants, they don't know what the others did. Context Bridge fixes that:

- **`log_chat`** — Every conversation turn gets auto-compressed and saved per-project
- **`get_chat`** — Any tool can pick up where another left off (token-budgeted)
- **`share_context`** — Post decisions, notes, TODOs across tools
- **`search_contexts`** — Find past decisions before making new ones

All tools share one SQLite DB (`~/.context-bridge/store.db`). Each spawns its own MCP server process. WAL mode handles concurrency.

## Setup (30 seconds)

```bash
bash <(curl -s https://raw.githubusercontent.com/Tide-Trends/context-bridge/main/setup.sh)
```

This will:
1. Clone the repo to `~/.context-bridge/server`
2. Install dependencies
3. Auto-configure Cursor and VS Code

Then paste the prompt for your tool from [`PROMPTS.md`](PROMPTS.md).

### Manual setup

```bash
git clone https://github.com/Tide-Trends/context-bridge.git ~/.context-bridge/server
cd ~/.context-bridge/server && npm install
```

Add to your MCP config:
```json
{
  "command": "node",
  "args": ["~/.context-bridge/server/src/index.js"]
}
```

## Tools (10 total)

| Tool | What it does |
|------|-------------|
| `log_chat` | Save a chat turn (auto-compressed) |
| `get_chat` | Get token-budgeted chat history |
| `share_context` | Post a decision/note/TODO/snippet |
| `get_context` | Get entry by ID |
| `list_contexts` | List recent entries (filterable) |
| `search_contexts` | Full-text search |
| `delete_context` | Remove an entry |
| `list_projects` | List all projects |
| `register_project` | Add a project |
| `get_project_summary` | Project overview + activity |

## Token optimization

- Entries auto-compressed on write (filler stripped, common words abbreviated)
- `get_chat` returns a token-budgeted window: recent entries in full, older ones as a rolling summary
- Default budget: 2000 tokens. Configurable per call.

## Architecture

```
Cursor ──┐
VS Code ─┤── stdio ──→ context-bridge MCP ──→ SQLite (WAL)
OpenCode ┤                                    ~/.context-bridge/store.db
Antigrav ┘
```

## License

MIT
