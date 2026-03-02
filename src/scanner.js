import { readdirSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { getDb } from './db.js';

// Directories to scan for projects
const SCAN_DIRS = [
    join(homedir(), 'AI'),
    join(homedir(), 'Developer'),
    join(homedir(), 'Documents', 'AI'),
];

// Indicators that a directory is a project
const PROJECT_INDICATORS = [
    '.git',
    'package.json',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    'Pipfile',
    'pyproject.toml',
    'Makefile',
    'CMakeLists.txt',
    'build.gradle',
    'pom.xml',
];

// File extensions that indicate a project (at top level of scan dir)
const PROJECT_EXTENSIONS = ['.xcodeproj', '.xcworkspace'];

export function scanProjects() {
    const db = getDb();
    const upsert = db.prepare(`
    INSERT INTO projects (name, path, description, discovered_at, source)
    VALUES (?, ?, ?, ?, 'auto')
    ON CONFLICT(name) DO UPDATE SET path = excluded.path
  `);

    const now = new Date().toISOString();
    let count = 0;

    for (const scanDir of SCAN_DIRS) {
        if (!existsSync(scanDir)) continue;

        let entries;
        try {
            entries = readdirSync(scanDir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            const fullPath = join(scanDir, entry.name);

            // Skip hidden files/dirs
            if (entry.name.startsWith('.')) continue;

            // Check for .xcodeproj / .xcworkspace files
            if (PROJECT_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
                // The project is the parent dir or the name without extension
                const projectName = basename(entry.name, entry.name.slice(entry.name.lastIndexOf('.')));
                upsert.run(projectName, scanDir, `Xcode project discovered in ${scanDir}`, now);
                count++;
                continue;
            }

            if (!entry.isDirectory()) continue;

            // Check if directory contains any project indicators
            const isProject = PROJECT_INDICATORS.some(indicator => {
                try {
                    return existsSync(join(fullPath, indicator));
                } catch {
                    return false;
                }
            });

            // Also consider any direct subdirectory of ~/AI as a project
            if (isProject || scanDir === join(homedir(), 'AI')) {
                upsert.run(entry.name, fullPath, `Auto-discovered in ${scanDir}`, now);
                count++;
            }
        }
    }

    return count;
}
