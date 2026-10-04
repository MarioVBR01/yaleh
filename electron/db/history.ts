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
