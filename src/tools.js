import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';
import { scanProjects } from './scanner.js';
import { compressText, buildChatWindow } from './compress.js';

// ─── Tool Definitions ───────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
    {
        name: 'share_context',
        description:
            'Share a context entry (decision, note, progress update, code snippet, TODO, question) with all connected AI tools. Use this whenever you make a decision, discover something important, complete a task, or want to leave a note for other tools working on the same or related projects.',
        inputSchema: {
            type: 'object',
            properties: {
                source: {
                    type: 'string',
                    description: 'Which tool is sharing this context',
                    enum: ['antigravity', 'cursor', 'vscode', 'opencode'],
                },
                project: {
                    type: 'string',
                    description: 'Project name this context relates to (optional, omit for general context)',
                },
                type: {
                    type: 'string',
                    description: 'Type of context entry',
                    enum: ['decision', 'note', 'progress', 'snippet', 'todo', 'question'],
                    default: 'note',
                },
                title: {
                    type: 'string',
                    description: 'Short summary title for this context entry',
                },
                content: {
                    type: 'string',
                    description: 'Detailed content — the actual context to share',
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional tags for categorization (e.g., "architecture", "bug-fix", "api")',
                },
            },
            required: ['source', 'title', 'content'],
        },
    },
    {
        name: 'get_context',
        description: 'Retrieve a specific context entry by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The UUID of the context entry to retrieve' },
            },
            required: ['id'],
        },
    },
    {
        name: 'list_contexts',
        description:
            'List recent context entries shared by any tool. Filter by project, source tool, type, or tag. Returns the most recent entries first.',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Filter by project name' },
                source: {
                    type: 'string',
                    description: 'Filter by source tool',
                    enum: ['antigravity', 'cursor', 'vscode', 'opencode'],
                },
                type: {
                    type: 'string',
                    description: 'Filter by context type',
                    enum: ['decision', 'note', 'progress', 'snippet', 'todo', 'question'],
                },
                tag: { type: 'string', description: 'Filter by tag' },
                limit: {
                    type: 'number',
                    description: 'Maximum number of entries to return (default 20, max 100)',
                    default: 20,
                },
            },
        },
    },
    {
        name: 'search_contexts',
        description: 'Full-text search across all shared context entries. Searches titles and content.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query string' },
                project: { type: 'string', description: 'Optional: limit search to a specific project' },
                limit: { type: 'number', description: 'Max results (default 20)', default: 20 },
            },
            required: ['query'],
        },
    },
    {
        name: 'delete_context',
        description: 'Delete a context entry by its ID.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The UUID of the context entry to delete' },
            },
            required: ['id'],
        },
    },
    {
        name: 'list_projects',
        description:
            'List all known projects. Projects are auto-discovered from ~/AI and can also be manually registered.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'register_project',
        description: 'Manually register a project directory so all tools can see it.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Human-readable project name' },
                path: { type: 'string', description: 'Absolute path to the project directory' },
                description: { type: 'string', description: 'Optional description of the project' },
            },
            required: ['name', 'path'],
        },
    },
    {
        name: 'get_project_summary',
        description:
            'Get a summary of a project including its path, description, and recent context entries from all tools.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Project name' },
            },
            required: ['name'],
        },
    },
    {
        name: 'log_chat',
        description:
            'Log a chat turn for a project. Auto-compresses content to minimize tokens. Call this after every meaningful exchange to keep other tools in sync.',
        inputSchema: {
            type: 'object',
            properties: {
                source: {
                    type: 'string',
                    description: 'Which tool is logging',
                    enum: ['antigravity', 'cursor', 'vscode', 'opencode'],
                },
                project: { type: 'string', description: 'Project name' },
                role: {
                    type: 'string',
                    description: 'Who sent this turn',
                    enum: ['user', 'assistant'],
                },
                summary: {
                    type: 'string',
                    description: 'What happened in this turn — will be auto-compressed',
                },
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Files created/modified/read in this turn',
                },
                actions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Actions taken (e.g., "created component", "fixed bug", "ran tests")',
                },
                result: {
                    type: 'string',
                    description: 'Outcome of this turn (e.g., "tests passing", "build failed")',
                },
            },
            required: ['source', 'project', 'role', 'summary'],
        },
    },
    {
        name: 'get_chat',
        description:
            'Get the chat history for a project. Returns a token-budgeted window: recent entries in full, older ones as a compressed summary. Use at the START of every conversation to pick up where other tools left off.',
        inputSchema: {
            type: 'object',
            properties: {
                project: { type: 'string', description: 'Project name' },
                token_budget: {
                    type: 'number',
                    description: 'Max token budget for the response (default 2000)',
                    default: 2000,
                },
            },
            required: ['project'],
        },
    },
    {
        name: 'remember',
        description:
            'Save a universal memory that persists across ALL projects and conversations. Use this for user preferences, tooling choices, hosting providers, coding conventions, or any fact that should be known everywhere. Examples: "Uses Coolify for hosting", "Prefers TypeScript over JavaScript", "Database is PostgreSQL on Supabase".',
        inputSchema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Short identifier for this memory (e.g., "hosting_provider", "preferred_language", "db_choice")',
                },
                value: {
                    type: 'string',
                    description: 'The actual fact or preference to remember',
                },
                category: {
                    type: 'string',
                    description: 'Category for organization',
                    enum: ['preferences', 'tooling', 'infrastructure', 'conventions', 'general'],
                    default: 'general',
                },
                source: {
                    type: 'string',
                    description: 'Which tool is saving this',
                    enum: ['antigravity', 'cursor', 'vscode', 'opencode'],
                },
            },
            required: ['key', 'value', 'source'],
        },
    },
    {
        name: 'recall',
        description:
            'Retrieve all universal memories. These are persistent facts and preferences that apply to EVERY project. Call this at the start of every conversation to know user preferences, tooling choices, and conventions.',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    description: 'Optional: filter by category',
                    enum: ['preferences', 'tooling', 'infrastructure', 'conventions', 'general'],
                },
            },
        },
    },
    {
        name: 'forget',
        description: 'Remove a universal memory by its key.',
        inputSchema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'The key of the memory to remove' },
            },
            required: ['key'],
        },
    },
];

// ─── Tool Handlers ──────────────────────────────────────────────────────────

export function handleTool(name, args) {
    switch (name) {
        case 'share_context':
            return shareContext(args);
        case 'get_context':
            return getContext(args);
        case 'list_contexts':
            return listContexts(args);
        case 'search_contexts':
            return searchContexts(args);
        case 'delete_context':
            return deleteContext(args);
        case 'list_projects':
            return listProjects();
        case 'register_project':
            return registerProject(args);
        case 'get_project_summary':
            return getProjectSummary(args);
        case 'log_chat':
            return logChat(args);
        case 'get_chat':
            return getChat(args);
        case 'remember':
            return rememberFact(args);
        case 'recall':
            return recallFacts(args);
        case 'forget':
            return forgetFact(args);
        default:
            return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
}

// ─── Implementations ────────────────────────────────────────────────────────

function shareContext({ source, project, type = 'note', title, content, tags = [] }) {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO contexts (id, source, project, type, title, content, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source, project || null, type, title, content, JSON.stringify(tags), now, now);

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    id,
                    message: `Context shared successfully. ID: ${id}`,
                }),
            },
        ],
    };
}

function getContext({ id }) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM contexts WHERE id = ?').get(id);

    if (!row) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Context not found' }) }], isError: true };
    }

    row.tags = JSON.parse(row.tags);
    return { content: [{ type: 'text', text: JSON.stringify(row) }] };
}

function listContexts({ project, source, type, tag, limit = 20 } = {}) {
    const db = getDb();
    limit = Math.min(Math.max(1, limit || 20), 100);

    let sql = 'SELECT * FROM contexts WHERE 1=1';
    const params = [];

    if (project) {
        sql += ' AND project = ?';
        params.push(project);
    }
    if (source) {
        sql += ' AND source = ?';
        params.push(source);
    }
    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }
    if (tag) {
        sql += " AND tags LIKE ?";
        params.push(`%"${tag}"%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    rows.forEach((r) => (r.tags = JSON.parse(r.tags)));

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ count: rows.length, entries: rows }),
            },
        ],
    };
}

function searchContexts({ query, project, limit = 20 }) {
    const db = getDb();
    limit = Math.min(Math.max(1, limit || 20), 100);
    const pattern = `%${query}%`;

    let sql = 'SELECT * FROM contexts WHERE (title LIKE ? OR content LIKE ?)';
    const params = [pattern, pattern];

    if (project) {
        sql += ' AND project = ?';
        params.push(project);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    rows.forEach((r) => (r.tags = JSON.parse(r.tags)));

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ query, count: rows.length, entries: rows }),
            },
        ],
    };
}

function deleteContext({ id }) {
    const db = getDb();
    const result = db.prepare('DELETE FROM contexts WHERE id = ?').run(id);

    if (result.changes === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Context not found' }) }], isError: true };
    }

    return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Deleted context ${id}` }) }],
    };
}

function listProjects() {
    const db = getDb();

    // Re-scan to pick up any new projects
    const discovered = scanProjects();

    const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    count: projects.length,
                    newlyDiscovered: discovered,
                    projects,
                }),
            },
        ],
    };
}

function registerProject({ name, path, description = '' }) {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO projects (name, path, description, discovered_at, source)
    VALUES (?, ?, ?, ?, 'manual')
    ON CONFLICT(name) DO UPDATE SET path = excluded.path, description = excluded.description
  `).run(name, path, description, now);

    return {
        content: [
            { type: 'text', text: JSON.stringify({ success: true, message: `Registered project: ${name}` }) },
        ],
    };
}

function getProjectSummary({ name }) {
    const db = getDb();

    const project = db.prepare('SELECT * FROM projects WHERE name = ?').get(name);
    if (!project) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Project "${name}" not found` }) }],
            isError: true,
        };
    }

    const recentContexts = db
        .prepare('SELECT * FROM contexts WHERE project = ? ORDER BY created_at DESC LIMIT 20')
        .all(name);
    recentContexts.forEach((r) => (r.tags = JSON.parse(r.tags)));

    const stats = db
        .prepare(
            `SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT source) as tool_count,
        MIN(created_at) as first_entry,
        MAX(created_at) as last_entry
      FROM contexts WHERE project = ?`
        )
        .get(name);

    const byType = db
        .prepare('SELECT type, COUNT(*) as count FROM contexts WHERE project = ? GROUP BY type')
        .all(name);

    const bySource = db
        .prepare('SELECT source, COUNT(*) as count FROM contexts WHERE project = ? GROUP BY source')
        .all(name);

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    project,
                    stats,
                    breakdownByType: byType,
                    breakdownBySource: bySource,
                    recentContexts,
                }),
            },
        ],
    };
}

// ─── Chat Logging ───────────────────────────────────────────────────────────

function logChat({ source, project, role, summary, files = [], actions = [], result = null }) {
    const db = getDb();
    const now = new Date().toISOString();

    // Compress the summary to save tokens
    const compressed = compressText(summary);

    // Compress actions too
    const compressedActions = actions.map((a) => compressText(a));

    db.prepare(`
    INSERT INTO chat_logs (project, source, role, summary, files, actions, result, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        project,
        source,
        role,
        compressed,
        JSON.stringify(files),
        JSON.stringify(compressedActions),
        result ? compressText(result) : null,
        now
    );

    const id = db.prepare('SELECT last_insert_rowid() as id').get().id;

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    ok: true,
                    id,
                    compressed_length: compressed.length,
                    original_length: summary.length,
                    saved: `${Math.round((1 - compressed.length / Math.max(summary.length, 1)) * 100)}%`,
                }),
            },
        ],
    };
}

function getChat({ project, token_budget = 2000 }) {
    const db = getDb();

    // Fetch all entries for this project, newest first
    const entries = db
        .prepare('SELECT * FROM chat_logs WHERE project = ? ORDER BY ts DESC')
        .all(project);

    if (entries.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        project,
                        entries: 0,
                        chat: [],
                        summary: null,
                        msg: 'No chat history for this project.',
                    }),
                },
            ],
        };
    }

    // Parse JSON fields
    entries.forEach((e) => {
        try { e.files = JSON.parse(e.files); } catch { e.files = []; }
        try { e.actions = JSON.parse(e.actions); } catch { e.actions = []; }
    });

    // Build token-budgeted window
    const window = buildChatWindow(entries, token_budget);

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    project,
                    total_entries: entries.length,
                    showing: window.recentEntries.length,
                    truncated: window.truncated,
                    est_tokens: window.totalTokens,
                    chat: window.recentEntries.map((e) => ({
                        src: e.source,
                        role: e.role,
                        t: e.ts,
                        s: e.summary,
                        files: e.files.length > 0 ? e.files : undefined,
                        acts: e.actions.length > 0 ? e.actions : undefined,
                        res: e.result || undefined,
                    })),
                    older: window.olderSummary || undefined,
                }),
            },
        ],
    };
}

// ─── Universal Memory ───────────────────────────────────────────────────────

function rememberFact({ key, value, category = 'general', source }) {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO universal_memory (key, value, category, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, category = excluded.category, source = excluded.source, updated_at = excluded.updated_at
  `).run(key, value, category, source, now, now);

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ ok: true, key, message: `Remembered: ${key} = ${value}` }),
            },
        ],
    };
}

function recallFacts({ category } = {}) {
    const db = getDb();

    let sql = 'SELECT * FROM universal_memory';
    const params = [];

    if (category) {
        sql += ' WHERE category = ?';
        params.push(category);
    }

    sql += ' ORDER BY category, key';

    const rows = db.prepare(sql).all(...params);

    // Group by category for clean output
    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push({ key: row.key, value: row.value, source: row.source, updated: row.updated_at });
    }

    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ count: rows.length, memories: grouped }),
            },
        ],
    };
}

function forgetFact({ key }) {
    const db = getDb();
    const result = db.prepare('DELETE FROM universal_memory WHERE key = ?').run(key);

    if (result.changes === 0) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Memory "${key}" not found` }) }], isError: true };
    }

    return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, message: `Forgot: ${key}` }) }],
    };
}
