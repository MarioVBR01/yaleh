/**
 * @file sqlite-session-store.ts
 * @description Almacenamiento de sesiones y eventos en SQLite, con la misma
 * interfaz que el almacenamiento JSON de la fase 2.
 */

import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { PersistedSession, SessionEvent, SessionStore } from '../session/store';

interface SessionRow {
  id: string;
  mode: PersistedSession['mode'];
  started_at: number;
  ends_at: number;
  duration_seconds: number;
  status: PersistedSession['status'];
}

interface EventRow {
  session_id: string | null;
  type: SessionEvent['type'];
  at: string;
  detail: string | null;
}

export class SqliteSessionStore implements SessionStore {
  private readonly selectLatest: StatementSync;
  private readonly upsertSession: StatementSync;
  private readonly insertEvent: StatementSync;
  private readonly selectEvents: StatementSync;

  constructor(private readonly db: DatabaseSync) {
    this.selectLatest = db.prepare(
      `SELECT id, mode, started_at, ends_at, duration_seconds, status
       FROM sessions ORDER BY started_at DESC, rowid DESC LIMIT 1`
    );
    // owner_uid y synced_at no se tocan aquí: los gestiona la sincronización (fase 10).
    this.upsertSession = db.prepare(
      `INSERT INTO sessions (id, mode, started_at, ends_at, duration_seconds, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         mode = excluded.mode,
         started_at = excluded.started_at,
         ends_at = excluded.ends_at,
         duration_seconds = excluded.duration_seconds,
         status = excluded.status`
    );
    this.insertEvent = db.prepare('INSERT INTO session_events (session_id, type, at, detail) VALUES (?, ?, ?, ?)');
    this.selectEvents = db.prepare('SELECT session_id, type, at, detail FROM session_events ORDER BY id');
  }

  /** true si ya existe una sesión con ese id (archivo .yaleh ya usado). */
  hasSession(sessionId: string): boolean {
    return this.db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(sessionId) !== undefined;
  }

  loadSession(): PersistedSession | null {
    const row = this.selectLatest.get() as SessionRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      mode: row.mode,
      startedAt: row.started_at,
      endsAt: row.ends_at,
      durationSeconds: row.duration_seconds,
      status: row.status,
    };
  }

  saveSession(session: PersistedSession): void {
    this.upsertSession.run(
      session.id,
      session.mode,
      session.startedAt,
      session.endsAt,
      session.durationSeconds,
      session.status
    );
  }

  appendEvent(event: SessionEvent): void {
    this.insertEvent.run(event.sessionId ?? null, event.type, event.at, event.detail ?? null);
  }

  listEvents(): SessionEvent[] {
    return (this.selectEvents.all() as unknown as EventRow[]).map(row => ({
      type: row.type,
      at: row.at,
      sessionId: row.session_id,
      ...(row.detail !== null ? { detail: row.detail } : {}),
    }));
  }

  /** Ejecuta `fn` en una transacción (todo o nada). */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
