/**
 * @file database.ts
 * @description Apertura de la base SQLite local con `node:sqlite` (Electron 42, Node 24).
 * Solo el proceso principal abre la base; la interfaz accede a los datos por IPC.
 */

import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations';

export const DATABASE_FILE_NAME = 'yaleh.db';

/** Abre (o crea) la base, activa WAL y claves foráneas, y aplica las migraciones. */
export function openDatabase(file: string): DatabaseSync {
  const db = new DatabaseSync(file);
  // WAL: escrituras más seguras ante cortes y lecturas concurrentes (db:inspect con la app abierta).
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 3000');
  runMigrations(db);
  return db;
}

/** Lee un valor de la tabla `settings`. */
export function getSetting(db: DatabaseSync, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/** Escribe un valor en la tabla `settings`. */
export function setSetting(db: DatabaseSync, key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

/**
 * Garantiza que exista el perfil local del equipo (el dueño de las sesiones
 * offline hasta que se sincronicen con una cuenta en la fase 10).
 */
export function ensureLocalProfile(db: DatabaseSync, newId: () => string = () => crypto.randomUUID()): string {
  const row = db.prepare('SELECT id FROM local_profile LIMIT 1').get() as { id: string } | undefined;
  if (row) return row.id;
  const id = newId();
  db.prepare('INSERT INTO local_profile (id, display_name, created_at) VALUES (?, NULL, ?)').run(
    id,
    new Date().toISOString()
  );
  return id;
}
