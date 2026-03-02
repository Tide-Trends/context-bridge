#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDb, closeDb } from './db.js';
import { TOOL_DEFINITIONS, handleTool } from './tools.js';
import { STATIC_RESOURCES, RESOURCE_TEMPLATES, handleResource } from './resources.js';
import { scanProjects } from './scanner.js';

// ─── Server Setup ───────────────────────────────────────────────────────────

const server = new Server(
    {
        name: 'context-bridge',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
        instructions: `Context Bridge is a shared context store for AI coding tools.
Use share_context to post decisions, notes, progress updates, code snippets, TODOs, or questions.
Use list_contexts or search_contexts to see what other tools have shared.
Use list_projects to discover known projects.
Always identify yourself as your tool name (antigravity, cursor, vscode, or opencode) when sharing context.`,
    }
);

// ─── Tool Handlers ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOL_DEFINITIONS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        })),
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        return handleTool(name, args || {});
    } catch (err) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
            isError: true,
        };
    }
});

// ─── Resource Handlers ──────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: STATIC_RESOURCES.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
        })),
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    try {
        return handleResource(uri);
    } catch (err) {
        return {
            contents: [{ uri, mimeType: 'text/plain', text: `Error: ${err.message}` }],
        };
    }
});

// ─── Startup ────────────────────────────────────────────────────────────────

async function main() {
    // Initialize database
    getDb();

    // Auto-discover projects on startup
    const projectCount = scanProjects();
    process.stderr.write(`[context-bridge] Initialized. Discovered ${projectCount} projects.\n`);

    // Connect via stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write('[context-bridge] MCP server running on stdio.\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
        closeDb();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        closeDb();
        process.exit(0);
    });
}

main().catch((err) => {
    process.stderr.write(`[context-bridge] Fatal error: ${err.message}\n`);
    process.exit(1);
});
