/**
 * @file history.ts
 * @description Historial de sesiones del escritorio (fase 10), desde SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { SessionHistoryEntry } from '../../shared/ipc-types';

interface HistoryRow {
  id: string;
  mode: SessionHistoryEntry['mode'];
  started_at: number;
  ends_at: number;
  duration_seconds: number;
  status: SessionHistoryEntry['status'];
  focus_lost: number;
  connection_lost: number;
  interruptions: number;
  end_reason: string | null;
}

export function listSessionHistory(db: DatabaseSync, limit = 500): SessionHistoryEntry[] {
  const count = (type: string) =>
    `(SELECT COUNT(*) FROM session_events e WHERE e.session_id = s.id AND e.type = '${type}')`;
  const rows = db
    .prepare(
      `SELECT s.id, s.mode, s.started_at, s.ends_at, s.duration_seconds, s.status,
         ${count('focus-lost')} AS focus_lost,
         ${count('connection-lost')} AS connection_lost,
         ${count('session-interrupted')} AS interruptions,
         (SELECT e.detail FROM session_events e
            WHERE e.session_id = s.id AND e.type = 'session-finished' ORDER BY e.id DESC LIMIT 1) AS end_reason
       FROM sessions s
       ORDER BY s.started_at DESC
       LIMIT ?`
    )
    .all(limit) as unknown as HistoryRow[];

  return rows.map(r => ({
    id: r.id,
    mode: r.mode,
    startedAt: r.started_at,
    endsAt: r.ends_at,
    durationSeconds: r.duration_seconds,
    status: r.status,
    focusLost: r.focus_lost,
    connectionLost: r.connection_lost,
    interruptions: r.interruptions,
    endReason: r.end_reason === 'completed' || r.end_reason === 'dev-release' ? r.end_reason : null,
  }));
}

/**
 * Borra el historial y las estadísticas (ORION #7): las sesiones que no están en curso y todos
 * los eventos que no pertenecen a una sesión en curso. Los ids borrados se guardan en
 * `used_session_ids` para que los .yaleh sigan siendo de uso único. No toca fuentes ni notas.
 * Devuelve cuántas sesiones borró.
 */
export function clearSessionHistory(db: DatabaseSync, now: Date = new Date()): number {
  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT OR IGNORE INTO used_session_ids (id, cleared_at) SELECT id, ? FROM sessions WHERE status <> 'active'`
    ).run(now.toISOString());
    db.prepare(
      `DELETE FROM session_events
       WHERE session_id IS NULL OR session_id NOT IN (SELECT id FROM sessions WHERE status = 'active')`
    ).run();
    const result = db.prepare(`DELETE FROM sessions WHERE status <> 'active'`).run();
    db.exec('COMMIT');
    return Number(result.changes);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
