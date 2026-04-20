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

  // Run schema creation
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execAsync(statement);
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
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', 1);
  }

  // Ensure local user exists
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM users LIMIT 1');
  if (!existing) {
    await db.runAsync(`
      INSERT INTO users (native_lang, target_lang, competence_score, interest_tags, diagnostic_completed)
      VALUES ('zh-CN', 'en', 1200.0, '[]', 0)
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
