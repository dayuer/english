import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('neuroglot.db');

  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Run schema creation (tolerant: new indexes referencing migrated columns may fail on v1→v2 upgrade)
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await db.execAsync(statement);
    } catch {
      // Expected when index references a column that hasn't been ALTERed yet (v1→v2 migration)
    }
  }

  // Ensure schema version
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);
  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version'
  );
  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', 2);
  } else if (versionRow.version < 2) {
    // Migration 1→2: add RAZ fields
    try { await db.execAsync('ALTER TABLE users ADD COLUMN raz_current_level TEXT DEFAULT \'AA\''); } catch {}
    try { await db.execAsync('ALTER TABLE users ADD COLUMN raz_level_mastery_pct REAL DEFAULT 0.0'); } catch {}
    try { await db.execAsync('ALTER TABLE lesson_queue ADD COLUMN raz_level TEXT DEFAULT \'AA\''); } catch {}
    try { await db.execAsync('ALTER TABLE lesson_queue ADD COLUMN target_words TEXT'); } catch {}
    try { await db.execAsync('ALTER TABLE user_chunks ADD COLUMN best_reaction_ms INTEGER DEFAULT 0'); } catch {}
    // Create indexes for new columns (safe after ALTER TABLE)
    try { await db.execAsync('CREATE INDEX IF NOT EXISTS idx_lesson_user_level ON lesson_queue(user_id, raz_level)'); } catch {}
    await db.runAsync('UPDATE schema_version SET version = 2');
  }

  // Ensure local user exists
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM users LIMIT 1');
  if (!existing) {
    await db.runAsync(`
      INSERT INTO users (native_lang, target_lang, competence_score, raz_current_level, raz_level_mastery_pct, interest_tags, diagnostic_completed)
      VALUES ('zh-CN', 'en', 1200.0, 'AA', 0.0, '[]', 0)
    `);
  }
}

/** Execute a typed query */
export async function query<T>(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<T[]> {
  const database = getDatabase();
  return database.getAllAsync<T>(sql, params);
}

/** Execute a typed single-row query */
export async function queryFirst<T>(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<T | null> {
  const database = getDatabase();
  return database.getFirstAsync<T>(sql, params);
}

/** Execute a write statement */
export async function execute(sql: string, params: SQLite.SQLiteBindValue[] = []): Promise<SQLite.SQLiteRunResult> {
  const database = getDatabase();
  return database.runAsync(sql, params);
}

/** Execute raw SQL (no params) */
export async function exec(sql: string): Promise<void> {
  const database = getDatabase();
  await database.execAsync(sql);
}
