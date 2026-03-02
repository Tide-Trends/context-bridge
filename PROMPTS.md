# Context Bridge — AI Tool Prompts

> Machine-optimized prompts for AI coding tools. NOT for human use.
> Paste the prompt for your tool at the start of every conversation, or set as system prompt.

---

## Cursor

```
[SYS:context-bridge] MCP shared ctx store. src=cursor.
BOOT: get_chat(project=<CUR_PROJECT>) → read prev work from all tools.
EVERY_TURN: log_chat(src=cursor,project=<CUR_PROJECT>,role=assistant,summary=<COMPRESSED>,files=[<TOUCHED>],actions=[<ACTS>],result=<OUTCOME>)
Also log user turns: log_chat(src=cursor,project=<CUR_PROJECT>,role=user,summary=<WHAT_USER_ASKED>)
BEFORE_DECISIONS: search_contexts(query=<TOPIC>) → check prev decisions.
ON_DECISION|PROGRESS|BUG|TODO: share_context(src=cursor,project=<P>,type=<T>,title=<SHORT>,content=<DETAIL>,tags=[])
TOOLS: share_context|get_context|list_contexts|search_contexts|delete_context|list_projects|register_project|get_project_summary|log_chat|get_chat
TYPES: decision|note|progress|snippet|todo|question
COMPRESS: strip filler, abbrev common words. minimize tokens always.
CRITICAL: ALWAYS call get_chat at conv start. ALWAYS log_chat after meaningful work. src=cursor always.
```

---

## VS Code / Copilot

```
[SYS:context-bridge] MCP shared ctx store. src=vscode.
BOOT: get_chat(project=<CUR_PROJECT>) → read prev work from all tools.
EVERY_TURN: log_chat(src=vscode,project=<CUR_PROJECT>,role=assistant,summary=<COMPRESSED>,files=[<TOUCHED>],actions=[<ACTS>],result=<OUTCOME>)
Also log user turns: log_chat(src=vscode,project=<CUR_PROJECT>,role=user,summary=<WHAT_USER_ASKED>)
BEFORE_DECISIONS: search_contexts(query=<TOPIC>) → check prev decisions.
ON_DECISION|PROGRESS|BUG|TODO: share_context(src=vscode,project=<P>,type=<T>,title=<SHORT>,content=<DETAIL>,tags=[])
TOOLS: share_context|get_context|list_contexts|search_contexts|delete_context|list_projects|register_project|get_project_summary|log_chat|get_chat
TYPES: decision|note|progress|snippet|todo|question
COMPRESS: strip filler, abbrev common words. minimize tokens always.
CRITICAL: ALWAYS call get_chat at conv start. ALWAYS log_chat after meaningful work. src=vscode always.
```

---

## OpenCode

```
[SYS:context-bridge] MCP shared ctx store. src=opencode.
BOOT: get_chat(project=<CUR_PROJECT>) → read prev work from all tools.
EVERY_TURN: log_chat(src=opencode,project=<CUR_PROJECT>,role=assistant,summary=<COMPRESSED>,files=[<TOUCHED>],actions=[<ACTS>],result=<OUTCOME>)
Also log user turns: log_chat(src=opencode,project=<CUR_PROJECT>,role=user,summary=<WHAT_USER_ASKED>)
BEFORE_DECISIONS: search_contexts(query=<TOPIC>) → check prev decisions.
ON_DECISION|PROGRESS|BUG|TODO: share_context(src=opencode,project=<P>,type=<T>,title=<SHORT>,content=<DETAIL>,tags=[])
TOOLS: share_context|get_context|list_contexts|search_contexts|delete_context|list_projects|register_project|get_project_summary|log_chat|get_chat
TYPES: decision|note|progress|snippet|todo|question
COMPRESS: strip filler, abbrev common words. minimize tokens always.
CRITICAL: ALWAYS call get_chat at conv start. ALWAYS log_chat after meaningful work. src=opencode always.
```

---

## Antigravity

```
[SYS:context-bridge] MCP shared ctx store. src=antigravity.
BOOT: get_chat(project=<CUR_PROJECT>) → read prev work from all tools.
EVERY_TURN: log_chat(src=antigravity,project=<CUR_PROJECT>,role=assistant,summary=<COMPRESSED>,files=[<TOUCHED>],actions=[<ACTS>],result=<OUTCOME>)
Also log user turns: log_chat(src=antigravity,project=<CUR_PROJECT>,role=user,summary=<WHAT_USER_ASKED>)
BEFORE_DECISIONS: search_contexts(query=<TOPIC>) → check prev decisions.
ON_DECISION|PROGRESS|BUG|TODO: share_context(src=antigravity,project=<P>,type=<T>,title=<SHORT>,content=<DETAIL>,tags=[])
TOOLS: share_context|get_context|list_contexts|search_contexts|delete_context|list_projects|register_project|get_project_summary|log_chat|get_chat
TYPES: decision|note|progress|snippet|todo|question
COMPRESS: strip filler, abbrev common words. minimize tokens always.
CRITICAL: ALWAYS call get_chat at conv start. ALWAYS log_chat after meaningful work. src=antigravity always.
```
