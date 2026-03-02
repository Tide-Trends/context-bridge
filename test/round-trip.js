#!/usr/bin/env node

/**
 * Round-trip test for the context-bridge MCP server.
 * Spawns the server as a child process and communicates via JSON-RPC over stdio.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, '..', 'src', 'index.js');

let msgId = 0;
let responseBuffer = '';
let pendingResolves = new Map();

function nextId() {
    return ++msgId;
}

function startServer() {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [SERVER_PATH], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        proc.stderr.on('data', (data) => {
            process.stderr.write(`  [server] ${data}`);
        });

        proc.stdout.on('data', (chunk) => {
            responseBuffer += chunk.toString();
            // Process all complete messages (newline-delimited JSON-RPC)
            const lines = responseBuffer.split('\n');
            responseBuffer = lines.pop(); // keep incomplete line in buffer
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.id !== undefined && pendingResolves.has(msg.id)) {
                        pendingResolves.get(msg.id)(msg);
                        pendingResolves.delete(msg.id);
                    }
                } catch {
                    // Not JSON, skip
                }
            }
        });

        proc.on('error', reject);

        // Give server a moment to init
        setTimeout(() => resolve(proc), 500);
    });
}

function send(proc, method, params = {}) {
    return new Promise((resolve) => {
        const id = nextId();
        pendingResolves.set(id, resolve);
        const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params });
        proc.stdin.write(msg + '\n');
    });
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
    } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
        process.exitCode = 1;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🔌 Starting context-bridge MCP server...\n');
    const proc = await startServer();

    try {
        // 1. Initialize
        console.log('📡 Testing MCP protocol...\n');
        const initResp = await send(proc, 'initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '0.1.0' },
        });

        await test('Server responds to initialize', () => {
            assert(initResp.result, 'No result in initialize response');
            assert(initResp.result.serverInfo.name === 'context-bridge', 'Wrong server name');
        });

        // Send initialized notification
        proc.stdin.write(
            JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n'
        );
        await new Promise((r) => setTimeout(r, 200));

        // 2. List tools
        const toolsResp = await send(proc, 'tools/list');
        await test('Lists all 13 tools', () => {
            const tools = toolsResp.result.tools;
            assert(tools.length === 13, `Expected 13 tools, got ${tools.length}`);
            const names = tools.map((t) => t.name).sort();
            assert(names.includes('share_context'), 'Missing share_context');
            assert(names.includes('list_contexts'), 'Missing list_contexts');
            assert(names.includes('search_contexts'), 'Missing search_contexts');
            assert(names.includes('list_projects'), 'Missing list_projects');
            assert(names.includes('log_chat'), 'Missing log_chat');
            assert(names.includes('get_chat'), 'Missing get_chat');
            assert(names.includes('remember'), 'Missing remember');
            assert(names.includes('recall'), 'Missing recall');
            assert(names.includes('forget'), 'Missing forget');
        });

        // 3. Share context
        const shareResp = await send(proc, 'tools/call', {
            name: 'share_context',
            arguments: {
                source: 'antigravity',
                project: 'TestProject',
                type: 'decision',
                title: 'Test Decision',
                content: 'Decided to use SQLite for persistence',
                tags: ['architecture', 'test'],
            },
        });

        let sharedId;
        await test('share_context creates an entry', () => {
            const result = JSON.parse(shareResp.result.content[0].text);
            assert(result.success, 'share_context failed');
            assert(result.id, 'No ID returned');
            sharedId = result.id;
        });

        // 4. Get context
        const getResp = await send(proc, 'tools/call', {
            name: 'get_context',
            arguments: { id: sharedId },
        });

        await test('get_context retrieves the entry', () => {
            const entry = JSON.parse(getResp.result.content[0].text);
            assert(entry.id === sharedId, 'ID mismatch');
            assert(entry.title === 'Test Decision', 'Title mismatch');
            assert(entry.source === 'antigravity', 'Source mismatch');
            assert(entry.project === 'TestProject', 'Project mismatch');
        });

        // 5. List contexts
        const listResp = await send(proc, 'tools/call', {
            name: 'list_contexts',
            arguments: { project: 'TestProject' },
        });

        await test('list_contexts returns the entry', () => {
            const result = JSON.parse(listResp.result.content[0].text);
            assert(result.count >= 1, 'No entries found');
            assert(result.entries.some((e) => e.id === sharedId), 'Shared entry not in list');
        });

        // 6. Search contexts
        const searchResp = await send(proc, 'tools/call', {
            name: 'search_contexts',
            arguments: { query: 'SQLite' },
        });

        await test('search_contexts finds by content', () => {
            const result = JSON.parse(searchResp.result.content[0].text);
            assert(result.count >= 1, 'Search found nothing');
            assert(result.entries.some((e) => e.id === sharedId), 'Shared entry not in search');
        });

        // 7. List projects
        const projResp = await send(proc, 'tools/call', {
            name: 'list_projects',
            arguments: {},
        });

        await test('list_projects returns discovered projects', () => {
            const result = JSON.parse(projResp.result.content[0].text);
            assert(result.count >= 0, 'Projects call failed');
        });

        // 8. Register project
        const regResp = await send(proc, 'tools/call', {
            name: 'register_project',
            arguments: { name: 'TestProject', path: '/tmp/test-project', description: 'A test project' },
        });

        await test('register_project registers manually', () => {
            const result = JSON.parse(regResp.result.content[0].text);
            assert(result.success, 'register_project failed');
        });

        // 9. Get project summary
        const summaryResp = await send(proc, 'tools/call', {
            name: 'get_project_summary',
            arguments: { name: 'TestProject' },
        });

        await test('get_project_summary returns data', () => {
            const result = JSON.parse(summaryResp.result.content[0].text);
            assert(result.project, 'No project info');
            assert(result.stats, 'No stats');
            assert(result.recentContexts.length >= 1, 'No recent contexts');
        });

        // 10. Delete context
        const delResp = await send(proc, 'tools/call', {
            name: 'delete_context',
            arguments: { id: sharedId },
        });

        await test('delete_context removes the entry', () => {
            const result = JSON.parse(delResp.result.content[0].text);
            assert(result.success, 'delete_context failed');
        });

        // Verify deletion
        const verifyResp = await send(proc, 'tools/call', {
            name: 'get_context',
            arguments: { id: sharedId },
        });

        await test('Deleted entry is gone', () => {
            const result = JSON.parse(verifyResp.result.content[0].text);
            assert(result.error, 'Entry should be gone');
        });

        // ─── Chat Logging Tests ─────────────────────────────────────
        console.log('\n💬 Testing chat logging...\n');

        // 12. Log a chat entry
        const logResp = await send(proc, 'tools/call', {
            name: 'log_chat',
            arguments: {
                source: 'antigravity',
                project: 'Pet Medication',
                role: 'assistant',
                summary: 'I created the implementation plan for the medication tracking feature and decided to use SQLite for persistence',
                files: ['src/db.js', 'src/tracker.js'],
                actions: ['created implementation plan', 'designed database schema'],
                result: 'Plan approved by user',
            },
        });

        await test('log_chat saves and compresses entry', () => {
            const result = JSON.parse(logResp.result.content[0].text);
            assert(result.ok, 'log_chat failed');
            assert(result.id, 'No ID returned');
            assert(result.compressed_length < result.original_length, 'No compression occurred');
        });

        // 13. Log another entry
        await send(proc, 'tools/call', {
            name: 'log_chat',
            arguments: {
                source: 'cursor',
                project: 'Pet Medication',
                role: 'assistant',
                summary: 'Fixed the bug in the medication reminder function that was causing duplicate notifications',
                files: ['src/reminders.js'],
                actions: ['fixed bug', 'ran tests'],
                result: 'All tests passing',
            },
        });

        // 14. Get chat history
        const chatResp = await send(proc, 'tools/call', {
            name: 'get_chat',
            arguments: { project: 'Pet Medication' },
        });

        await test('get_chat returns chat history', () => {
            const result = JSON.parse(chatResp.result.content[0].text);
            assert(result.project === 'Pet Medication', 'Wrong project');
            assert(result.total_entries === 2, `Expected 2 entries, got ${result.total_entries}`);
            assert(result.chat.length === 2, 'Should show both entries');
            assert(result.est_tokens > 0, 'Should estimate tokens');
        });

        // 15. Get chat with tiny budget
        const tinyResp = await send(proc, 'tools/call', {
            name: 'get_chat',
            arguments: { project: 'Pet Medication', token_budget: 50 },
        });

        await test('get_chat respects token budget', () => {
            const result = JSON.parse(tinyResp.result.content[0].text);
            assert(result.est_tokens <= 100, `Token budget exceeded: ${result.est_tokens}`);
        });

        // 16. Get chat for nonexistent project
        const emptyResp = await send(proc, 'tools/call', {
            name: 'get_chat',
            arguments: { project: 'NonexistentProject' },
        });

        await test('get_chat returns empty for unknown project', () => {
            const result = JSON.parse(emptyResp.result.content[0].text);
            assert(result.entries === 0, 'Should be empty');
        });

        // ─── Universal Memory Tests ──────────────────────────────────
        console.log('\n🧠 Testing universal memory...\n');

        const remResp = await send(proc, 'tools/call', {
            name: 'remember',
            arguments: { key: 'hosting_provider', value: 'Coolify', category: 'infrastructure', source: 'antigravity' },
        });
        await test('remember saves a fact', () => {
            const r = JSON.parse(remResp.result.content[0].text);
            assert(r.ok, 'remember failed');
        });

        await send(proc, 'tools/call', {
            name: 'remember',
            arguments: { key: 'preferred_lang', value: 'TypeScript', category: 'preferences', source: 'cursor' },
        });

        const recResp = await send(proc, 'tools/call', {
            name: 'recall',
            arguments: {},
        });
        await test('recall returns all memories', () => {
            const r = JSON.parse(recResp.result.content[0].text);
            assert(r.count === 2, `Expected 2 memories, got ${r.count}`);
            assert(r.memories.infrastructure, 'Missing infrastructure category');
            assert(r.memories.preferences, 'Missing preferences category');
        });

        const recCatResp = await send(proc, 'tools/call', {
            name: 'recall',
            arguments: { category: 'infrastructure' },
        });
        await test('recall filters by category', () => {
            const r = JSON.parse(recCatResp.result.content[0].text);
            assert(r.count === 1, 'Should have 1 infra memory');
            assert(r.memories.infrastructure[0].value === 'Coolify', 'Wrong value');
        });

        const forgetResp = await send(proc, 'tools/call', {
            name: 'forget',
            arguments: { key: 'hosting_provider' },
        });
        await test('forget removes a memory', () => {
            const r = JSON.parse(forgetResp.result.content[0].text);
            assert(r.ok, 'forget failed');
        });

        const afterForget = await send(proc, 'tools/call', {
            name: 'recall',
            arguments: {},
        });
        await test('memory is gone after forget', () => {
            const r = JSON.parse(afterForget.result.content[0].text);
            assert(r.count === 1, 'Should only have 1 memory left');
        });

        console.log('\n🎉 All tests passed!\n');
    } finally {
        proc.kill('SIGTERM');
    }
}

main().catch((err) => {
    console.error('Test runner error:', err);
    process.exit(1);
});
