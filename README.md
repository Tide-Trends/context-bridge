# 🔌 Context Bridge

**Share context between AI coding tools.** One SQLite database, every tool in sync.

Works with **Cursor**, **VS Code (Copilot)**, **Antigravity**, and **OpenCode** — or any tool that supports [MCP](https://modelcontextprotocol.io).

## What it does

When you work with multiple AI coding assistants, they don't know what the others did. Context Bridge fixes that:

- **Per-project chat logging** — Every conversation turn gets auto-compressed and saved. Any tool can pick up where another left off.
- **Universal memory** — Save preferences and facts that apply to EVERY project (e.g., "Uses Coolify for hosting", "Prefers TypeScript").
- **Shared context store** — Post decisions, notes, TODOs, snippets across tools. Search them later.
- **Token-optimized** — Entries auto-compressed on write. Chat retrieval is token-budgeted with rolling summaries for older entries.

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

## Tools (13 total)

| Tool | What it does |
|------|-------------|
| **Chat** | |
| `log_chat` | Save a chat turn (auto-compressed) |
| `get_chat` | Get token-budgeted chat history |
| **Context** | |
| `share_context` | Post a decision/note/TODO/snippet |
| `get_context` | Get entry by ID |
| `list_contexts` | List recent entries (filterable) |
| `search_contexts` | Full-text search |
| `delete_context` | Remove an entry |
| **Memory** | |
| `remember` | Save a fact/preference across ALL projects |
| `recall` | Get all universal memories |
| `forget` | Remove a memory |
| **Projects** | |
| `list_projects` | List all projects |
| `register_project` | Add a project |
| `get_project_summary` | Project overview + activity |

## Architecture

```
Cursor ──┐
VS Code ─┤── stdio ──→ context-bridge MCP ──→ SQLite (WAL)
OpenCode ┤                                    ~/.context-bridge/store.db
Antigrav ┘
```

## License

MIT
