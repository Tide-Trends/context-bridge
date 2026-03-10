// ─── Token-Optimized Compression ────────────────────────────────────────────
// Compresses chat entries and builds token-budgeted windows for retrieval.

// Common abbreviation map for compression
const ABBREV = [
    [/\bfunction\b/gi, 'fn'],
    [/\bcomponent\b/gi, 'cmp'],
    [/\bimplementation\b/gi, 'impl'],
    [/\bconfiguration\b/gi, 'cfg'],
    [/\bapplication\b/gi, 'app'],
    [/\bdirectory\b/gi, 'dir'],
    [/\bpackage\b/gi, 'pkg'],
    [/\bdependenc(y|ies)\b/gi, 'dep$1'],
    [/\brepository\b/gi, 'repo'],
    [/\bdatabase\b/gi, 'db'],
    [/\bparameter\b/gi, 'param'],
    [/\bargument\b/gi, 'arg'],
    [/\btemplate\b/gi, 'tmpl'],
    [/\bmodified\b/gi, 'mod'],
    [/\bcreated\b/gi, 'cr8d'],
    [/\bdeleted\b/gi, 'del'],
    [/\bupdated\b/gi, 'upd'],
    [/\binstalled\b/gi, 'inst'],
    [/\benvironment\b/gi, 'env'],
    [/\bvariable\b/gi, 'var'],
    [/\bauthentication\b/gi, 'auth'],
    [/\bauthorization\b/gi, 'authz'],
    [/\bnavigation\b/gi, 'nav'],
    [/\bcontroller\b/gi, 'ctrl'],
    [/\bmanagement\b/gi, 'mgmt'],
    [/\bdevelopment\b/gi, 'dev'],
    [/\bproduction\b/gi, 'prod'],
    [/\bperformance\b/gi, 'perf'],
    [/\bdocumentation\b/gi, 'docs'],
    [/\brefactored?\b/gi, 'refac'],
    [/\bdebugg(ing|ed)\b/gi, 'dbg'],
    [/\btroublesho(ot|ting)\b/gi, 'tshoot'],
    [/\barchitecture\b/gi, 'arch'],
    [/\binfrastructure\b/gi, 'infra'],
    [/\bsuccesfully\b/gi, 'ok'],
    [/\bsuccessfully\b/gi, 'ok'],
    [/\brequest\b/gi, 'req'],
    [/\bresponse\b/gi, 'res'],
    [/\bmessage\b/gi, 'msg'],
    [/\berror\b/gi, 'err'],
    [/\bclient\b/gi, 'clnt'],
    [/\bserver\b/gi, 'srv'],
    [/\bmodule\b/gi, 'mod'],
    [/\bcontext\b/gi, 'ctx'],
    [/\bsystem\b/gi, 'sys'],
    [/\bnetwork\b/gi, 'net'],
    [/\bdynamic\b/gi, 'dyn'],
    [/\bstatic\b/gi, 'stat'],
    [/\binterface\b/gi, 'iface'],
    [/\bglobal\b/gi, 'glb'],
    [/\blocal\b/gi, 'loc'],
    [/\bproperty\b/gi, 'prop'],
    [/\battribute\b/gi, 'attr'],
    [/\belement\b/gi, 'el'],
    [/\binitialize\b/gi, 'init'],
    [/\bconjunction\b/gi, 'conj'],
    [/\bcongratulations\b/gi, 'grats'],
    [/\binformation\b/gi, 'info'],
    [/\bthe\s+/gi, ''],
    [/\bthat\s+/gi, ''],
    [/\bwhich\s+/gi, ''],
    [/\bplease\s*/gi, ''],
    [/\bbasically\s*/gi, ''],
    [/\bessentially\s*/gi, ''],
    [/\bcurrently\b/gi, 'now'],
    [/\bpreviously\b/gi, 'prev'],
    [/\badditionally\b/gi, '+'],
    [/\bfurthermore\b/gi, '+'],
    [/\bhowever\b/gi, 'but'],
    [/\btherefore\b/gi, '∴'],
    [/\bbecause\b/gi, 'bc'],
    [/\,\s+and\s+/gi, ', '],
    [/\s{2,}/g, ' '],
];

// Filler patterns to strip entirely
const FILLER = [
    /I('d| would) be happy to\s*/gi,
    /Let me\s*/gi,
    /I('ll| will) now\s*/gi,
    /Now,?\s*let('s| us)\s*/gi,
    /Here('s| is) (what|how)\s*/gi,
    /As (you can see|mentioned|noted)\s*/gi,
    /Going forward,?\s*/gi,
    /In order to\s*/gi,
    /It('s| is) (important|worth noting) (that|to)\s*/gi,
    /Make sure (to|that)\s*/gi,
    /Keep in mind (that)?\s*/gi,
    /I('ve| have) (gone ahead and|just)\s*/gi,
    /To (do this|achieve this),?\s*/gi,
    /You('ll| will) (want to|need to)\s*/gi,
    /Before we (begin|start),?\s*/gi,
];

/**
 * Compress a text entry to minimize token usage.
 * Strips filler phrases, abbreviates common words, collapses whitespace.
 */
export function compressText(text) {
    if (!text) return '';
    let t = text.trim();

    // Strip filler
    for (const f of FILLER) {
        t = t.replace(f, '');
    }

    // Apply abbreviations
    for (const [pattern, replacement] of ABBREV) {
        t = t.replace(pattern, replacement);
    }

    // Collapse whitespace and trim
    t = t.replace(/\s+/g, ' ').trim();

    return t;
}

/**
 * Estimate token count (rough: ~4 chars per token for English).
 */
export function estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
}

/**
 * Build a token-budgeted chat window from entries.
 * Returns recent entries in full, older ones collapsed into a summary.
 *
 * @param {Array} entries - Chat log entries sorted newest-first
 * @param {number} budget - Max token budget (default 2000)
 * @returns {object} { recentEntries, olderSummary, totalTokens, truncated }
 */
export function buildChatWindow(entries, budget = 2000) {
    if (!entries || entries.length === 0) {
        return { recentEntries: [], olderSummary: null, totalTokens: 0, truncated: false };
    }

    const recent = [];
    let tokensUsed = 0;
    let cutoff = 0;

    // Add recent entries until we use ~70% of budget
    const recentBudget = Math.floor(budget * 0.7);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const entryText = formatEntry(entry);
        const entryTokens = estimateTokens(entryText);

        if (tokensUsed + entryTokens > recentBudget && recent.length > 0) {
            cutoff = i;
            break;
        }

        recent.push(entry);
        tokensUsed += entryTokens;
        cutoff = i + 1;
    }

    // Summarize older entries if any remain
    let olderSummary = null;
    if (cutoff < entries.length) {
        const older = entries.slice(cutoff);
        const summaryBudget = budget - tokensUsed;
        olderSummary = compressBatch(older, summaryBudget);
        tokensUsed += estimateTokens(olderSummary);
    }

    return {
        recentEntries: recent,
        olderSummary,
        totalTokens: tokensUsed,
        truncated: cutoff < entries.length,
    };
}

/**
 * Compress a batch of older entries into a compact summary.
 */
function compressBatch(entries, tokenBudget) {
    // Group by source for compact representation
    const bySource = {};
    const fileSet = new Set();
    const actionSet = new Set();

    for (const e of entries) {
        if (!bySource[e.source]) bySource[e.source] = [];
        bySource[e.source].push(e.summary);

        if (e.files) {
            try {
                JSON.parse(e.files).forEach((f) => fileSet.add(f));
            } catch { }
        }
        if (e.actions) {
            try {
                JSON.parse(e.actions).forEach((a) => actionSet.add(a));
            } catch { }
        }
    }

    let summary = `[${entries.length} older entries] `;

    for (const [src, summaries] of Object.entries(bySource)) {
        summary += `${src}: ${summaries.join('; ')} | `;
    }

    if (fileSet.size > 0) {
        summary += `files: ${[...fileSet].join(',')} `;
    }
    if (actionSet.size > 0) {
        summary += `acts: ${[...actionSet].join(',')} `;
    }

    // Truncate to budget
    const maxChars = tokenBudget * 4;
    if (summary.length > maxChars) {
        summary = summary.slice(0, maxChars - 3) + '...';
    }

    return summary.trim();
}

/**
 * Format a single entry as a compact string for token counting.
 */
function formatEntry(entry) {
    return `[${entry.source}/${entry.role}@${entry.ts}] ${entry.summary}${entry.result ? ' →' + entry.result : ''}`;
}
