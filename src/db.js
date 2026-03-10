import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DB_DIR = join(homedir(), '.context-bridge');
const DB_PATH = join(DB_DIR, 'store.db');

let _db = null;

export function getDb() {
  if (_db) return _db;

  mkdirSync(DB_DIR, { recursive: true });

  _db = new Database(DB_PATH);

  // Enable WAL mode for safe concurrent access from multiple tool processes
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      project TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      name TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      discovered_at TEXT NOT NULL,
      source TEXT DEFAULT 'auto'
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL,
      source TEXT NOT NULL,
      role TEXT NOT NULL,
      summary TEXT NOT NULL,
      files TEXT DEFAULT '[]',
      actions TEXT DEFAULT '[]',
      result TEXT,
      ts TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contexts_project ON contexts(project);
    CREATE INDEX IF NOT EXISTS idx_contexts_source ON contexts(source);
    CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts(type);
    CREATE INDEX IF NOT EXISTS idx_contexts_created ON contexts(created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_logs(project);
    CREATE INDEX IF NOT EXISTS idx_chat_ts ON chat_logs(ts);

    CREATE TABLE IF NOT EXISTS universal_memory (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memory_category ON universal_memory(category);

    -- FTS5 Virtual Table for Lightning Fast Searching
    CREATE VIRTUAL TABLE IF NOT EXISTS contexts_fts USING fts5(
      id UNINDEXED,
      title,
      content,
      tags,
      content='contexts',
      content_rowid='rowid'
    );

    -- Triggers to automatically sync the FTS5 index when contexts change
    CREATE TRIGGER IF NOT EXISTS contexts_ai AFTER INSERT ON contexts BEGIN
      INSERT INTO contexts_fts(rowid, id, title, content, tags) 
      VALUES (new.rowid, new.id, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS contexts_ad AFTER DELETE ON contexts BEGIN
      INSERT INTO contexts_fts(contexts_fts, rowid, id, title, content, tags) 
      VALUES('delete', old.rowid, old.id, old.title, old.content, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS contexts_au AFTER UPDATE ON contexts BEGIN
      INSERT INTO contexts_fts(contexts_fts, rowid, id, title, content, tags) 
      VALUES('delete', old.rowid, old.id, old.title, old.content, old.tags);
      INSERT INTO contexts_fts(rowid, id, title, content, tags) 
      VALUES (new.rowid, new.id, new.title, new.content, new.tags);
    END;
  `);

  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
