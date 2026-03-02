import { getDb } from './db.js';

// ─── Resource Definitions ───────────────────────────────────────────────────

export const RESOURCE_TEMPLATES = [
    {
        uriTemplate: 'context://project/{name}',
        name: 'Project Context',
        description: 'All context entries for a specific project',
        mimeType: 'application/json',
    },
];

export const STATIC_RESOURCES = [
    {
        uri: 'context://recent',
        name: 'Recent Context',
        description: 'The 20 most recent context entries across all projects and tools',
        mimeType: 'application/json',
    },
];

// ─── Resource Handlers ──────────────────────────────────────────────────────

export function handleResource(uri) {
    if (uri === 'context://recent') {
        return getRecentContext();
    }

    const projectMatch = uri.match(/^context:\/\/project\/(.+)$/);
    if (projectMatch) {
        return getProjectContext(decodeURIComponent(projectMatch[1]));
    }

    return { contents: [{ uri, mimeType: 'text/plain', text: 'Unknown resource' }] };
}

function getRecentContext() {
    const db = getDb();
    const rows = db
        .prepare('SELECT * FROM contexts ORDER BY created_at DESC LIMIT 20')
        .all();
    rows.forEach((r) => (r.tags = JSON.parse(r.tags)));

    return {
        contents: [
            {
                uri: 'context://recent',
                mimeType: 'application/json',
                text: JSON.stringify({ count: rows.length, entries: rows }, null, 2),
            },
        ],
    };
}

function getProjectContext(name) {
    const db = getDb();
    const rows = db
        .prepare('SELECT * FROM contexts WHERE project = ? ORDER BY created_at DESC')
        .all(name);
    rows.forEach((r) => (r.tags = JSON.parse(r.tags)));

    return {
        contents: [
            {
                uri: `context://project/${encodeURIComponent(name)}`,
                mimeType: 'application/json',
                text: JSON.stringify({ project: name, count: rows.length, entries: rows }, null, 2),
            },
        ],
    };
}
