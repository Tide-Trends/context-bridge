# 🔌 Context Bridge

**One brain for all your AI coding tools.**

If you use Cursor, VS Code (Copilot/Cline/Roo), OpenCode, and Antigravity, they don't talk to each other. If Cursor fixes a bug, VS Code doesn't know about it. 

**Context Bridge solves this. It runs a local database that all your AI tools read and write to.**

---

## What does it do?

Context Bridge gives your AI tools two superpowers:

### 1. Global Memory (Everywhere)
Teach your AI something *once*, and it remembers it for *every project forever*.
* *Example:* "I prefer TypeScript over JavaScript"
* *Example:* "I deploy on Vercel" 
* *Whenever you start a new conversation, the AI instantly knows your universal preferences.*

### 2. Per-Project Context (Local)
Your AI tools leave notes for each other inside a specific project.
* *Example:* Cursor figures out how an undocumented API works and leaves a note. Later, VS Code reads that note instead of starting from scratch.
* *Example:* The AI logs a compressed version of your chat history. So if you switch from Antigravity to Cursor mid-task, Cursor can read exactly what you've been working on.

---

## Getting Started (1-Minute Setup)

You don't need any complex configuration. Just run this command in your terminal:

```bash
bash <(curl -s https://raw.githubusercontent.com/Tide-Trends/context-bridge/main/setup.sh)
```

**What this does:**
1. Downloads the server to `~/.context-bridge`
2. Automatically configures **Cursor** and **VS Code (Copilot, Cline, & Roo Code)**.

### The Final Step
Your AI tools need to know the "rules of the game". Open the [`PROMPTS.md`](PROMPTS.md) file and paste the specific prompt for your tool into its system rules.

---

## How it works under the hood

Context Bridge uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). 

It runs an ultra-lightweight SQLite database locally on your machine. All your AI tools connect to it simultaneously (using `stdio` and WAL mode for safe concurrency). They auto-compress chat histories to save tokens, and smartly budget how much past context to pull.

| Tool Category | What the AI can do |
|---------------|--------------------|
| **🧠 Global Memory** | `remember`, `recall`, `forget` universal facts across all projects. |
| **📁 Project Chat** | `log_chat`, `get_chat` to pick up conversations right where you left off. |
| **💡 Shared Notes** | `share_context`, `search_contexts` to leave architectural decisions and TODOs. |

### Manual Installation (Optional)

If you prefer building from source rather than using the setup script:

```bash
git clone https://github.com/Tide-Trends/context-bridge.git ~/.context-bridge/server
cd ~/.context-bridge/server && npm install
```

Then configure your MCP engine to run:
`node ~/.context-bridge/server/src/index.js`
