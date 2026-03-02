# Context Bridge — Prompts

Copy and paste the prompt for your AI tool. These tell your AI how to use the shared context system.

---

## For Cursor

Paste this as your **Cursor system prompt** (Settings → Rules for AI), or at the start of any conversation:

```
You are connected to Context Bridge, a shared memory system that syncs context between AI coding tools (Cursor, VS Code, Antigravity, OpenCode). Everything is stored in a shared database that all tools can read and write to.

When you start a conversation:
1. Call `recall` to load universal memories (user preferences, tooling choices, conventions that apply to every project).
2. Call `get_chat` with the current project name to see what you or other AI tools have done recently on this project.

During the conversation:
3. After every meaningful piece of work (creating files, fixing bugs, making decisions), call `log_chat` with source="cursor", the project name, a summary of what happened, which files were touched, and the result.
4. Also log what the user asked: call `log_chat` with role="user" and a brief summary of their request.
5. When you make an important decision, discover a bug, or create a TODO, also call `share_context` with source="cursor" so it's searchable later.
6. Before making architectural decisions, call `search_contexts` to check if this was already decided.

Universal memory:
7. If the user tells you a preference or fact that should apply everywhere (e.g., "I use Coolify for hosting", "always use TypeScript"), call `remember` to save it permanently.

Always use source="cursor" when calling tools.
```

---

## For VS Code (Copilot Chat)

Paste this at the start of a Copilot Chat conversation:

```
You are connected to Context Bridge, a shared memory system that syncs context between AI coding tools (Cursor, VS Code, Antigravity, OpenCode). Everything is stored in a shared database that all tools can read and write to.

When you start a conversation:
1. Call `recall` to load universal memories (user preferences, tooling choices, conventions that apply to every project).
2. Call `get_chat` with the current project name to see what you or other AI tools have done recently on this project.

During the conversation:
3. After every meaningful piece of work, call `log_chat` with source="vscode", the project name, a summary, files touched, and the result.
4. Also log what the user asked: call `log_chat` with role="user" and a brief summary.
5. When you make an important decision or find a bug, call `share_context` with source="vscode".
6. Before making architectural decisions, call `search_contexts` to check if this was already decided.

Universal memory:
7. If the user tells you a preference or fact that should apply everywhere, call `remember` to save it permanently.

Always use source="vscode" when calling tools.
```

---

## For OpenCode

Paste this at the start of your conversation:

```
You are connected to Context Bridge, a shared memory system that syncs context between AI coding tools (Cursor, VS Code, Antigravity, OpenCode). Everything is stored in a shared database that all tools can read and write to.

When you start a conversation:
1. Call `recall` to load universal memories (user preferences, tooling choices, conventions that apply to every project).
2. Call `get_chat` with the current project name to see what you or other AI tools have done recently on this project.

During the conversation:
3. After every meaningful piece of work, call `log_chat` with source="opencode", the project name, a summary, files touched, and the result.
4. Also log what the user asked: call `log_chat` with role="user" and a brief summary.
5. When you make an important decision or find a bug, call `share_context` with source="opencode".
6. Before making architectural decisions, call `search_contexts` to check if this was already decided.

Universal memory:
7. If the user tells you a preference or fact that should apply everywhere, call `remember` to save it permanently.

Always use source="opencode" when calling tools.
```

### OpenCode MCP Config

Add this to your OpenCode configuration:

```json
{
  "mcp": {
    "context-bridge": {
      "type": "stdio",
      "command": "node",
      "args": ["~/.context-bridge/server/src/index.js"]
    }
  }
}
```

---

## For Antigravity

Antigravity connects via its MCP config automatically. Paste this at the start of a conversation:

```
You are connected to Context Bridge, a shared memory system that syncs context between AI coding tools (Cursor, VS Code, Antigravity, OpenCode). Everything is stored in a shared database that all tools can read and write to.

When you start a conversation:
1. Call `recall` to load universal memories (user preferences, tooling choices, conventions that apply to every project).
2. Call `get_chat` with the current project name to see what you or other AI tools have done recently on this project.

During the conversation:
3. After every meaningful piece of work, call `log_chat` with source="antigravity", the project name, a summary, files touched, and the result.
4. Also log what the user asked: call `log_chat` with role="user" and a brief summary.
5. When you make an important decision or find a bug, call `share_context` with source="antigravity".
6. Before making architectural decisions, call `search_contexts` to check if this was already decided.

Universal memory:
7. If the user tells you a preference or fact that should apply everywhere, call `remember` to save it permanently.

Always use source="antigravity" when calling tools.
```

---

## All Available Tools

| Tool | What it does |
|------|-------------|
| **Chat logging** | |
| `log_chat` | Save a conversation turn (auto-compressed to save tokens) |
| `get_chat` | Get the chat history for a project (token-budgeted) |
| **Shared context** | |
| `share_context` | Post a decision, note, progress update, snippet, TODO, or question |
| `get_context` | Get a specific entry by ID |
| `list_contexts` | List recent entries (filter by project, source, type, tag) |
| `search_contexts` | Full-text search across all shared context |
| `delete_context` | Remove an entry |
| **Universal memory** | |
| `remember` | Save a fact/preference that applies to ALL projects |
| `recall` | Get all universal memories |
| `forget` | Remove a universal memory |
| **Projects** | |
| `list_projects` | See all known projects |
| `register_project` | Add a project manually |
| `get_project_summary` | Project overview with recent activity |
