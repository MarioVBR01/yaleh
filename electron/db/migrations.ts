/**
 * @file migrations.ts
 * @description Migraciones versionadas de la base SQLite local (brief, sección 8.5).
 * Cada migración se aplica una sola vez, dentro de una transacción, y queda
 * registrada en `schema_migrations`. Nunca se edita una migración ya publicada:
 * los cambios van en una migración nueva con la versión siguiente.
 */

import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial',
    sql: `
      CREATE TABLE sessions (
        id               TEXT PRIMARY KEY,
        mode             TEXT NOT NULL CHECK (mode IN ('online', 'offline')),
        started_at       INTEGER NOT NULL,           -- epoch en milisegundos
        ends_at          INTEGER NOT NULL,           -- epoch en milisegundos
        duration_seconds INTEGER NOT NULL,
        status           TEXT NOT NULL CHECK (status IN ('active', 'finished', 'interrupted')),
        owner_uid        TEXT,                        -- fase 10 (sincronización)
        synced_at        TEXT                         -- fase 10 (sincronización)
      );
      CREATE INDEX idx_sessions_started_at ON sessions (started_at);

      -- Sin clave foránea: hay eventos sin sesión (enlaces inválidos) y eventos
      -- importados de la fase 2 cuyas sesiones antiguas no se guardaron.
      CREATE TABLE session_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        type       TEXT NOT NULL,
        at         TEXT NOT NULL,                     -- ISO 8601
        detail     TEXT
      );
      CREATE INDEX idx_session_events_session ON session_events (session_id);

      CREATE TABLE local_profile (
        id           TEXT PRIMARY KEY,
        display_name TEXT,
        created_at   TEXT NOT NULL
      );

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'workspace',
    sql: `
      -- Espacio de trabajo offline (fase 6): texto extraído de las fuentes y notas.
      -- workspace_id es el id local de la sesión (la fila de sessions se crea al iniciarla).
      CREATE TABLE sources (
        id           TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name         TEXT NOT NULL,
        mime         TEXT,
        size         INTEGER,
        char_count   INTEGER NOT NULL,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX idx_sources_workspace ON sources (workspace_id);

      CREATE TABLE source_chunks (
        source_id TEXT NOT NULL,
        idx       INTEGER NOT NULL,
        text      TEXT NOT NULL,
        PRIMARY KEY (source_id, idx)
      );

      CREATE TABLE notes (
        id           TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        text         TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX idx_notes_workspace ON notes (workspace_id);
    `,
  },
];

/**
 * Aplica las migraciones pendientes. Es idempotente: ejecutarla varias veces
 * no cambia una base ya actualizada. Devuelve las versiones aplicadas ahora.
 */
export function runMigrations(db: DatabaseSync, migrations: readonly Migration[] = MIGRATIONS): number[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(r => r.version)
  );
  const insert = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
  const appliedNow: number[] = [];

  for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      insert.run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`La migración ${migration.version} (${migration.name}) falló: ${String(error)}`);
    }
    appliedNow.push(migration.version);
  }
  return appliedNow;
}
