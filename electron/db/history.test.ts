// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { listSessionHistory } from './history';
import { runMigrations } from './migrations';
import { SqliteSessionStore } from './sqlite-session-store';

function setup() {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  return { db, store: new SqliteSessionStore(db) };
}

describe('listSessionHistory', () => {
  it('cuenta pérdidas de foco, cortes de red e interrupciones por sesión', () => {
    const { db, store } = setup();
    const at = new Date().toISOString();
    store.saveSession({ id: 'a', mode: 'online', startedAt: 1_000, endsAt: 61_000, durationSeconds: 60, status: 'finished' });
    store.saveSession({ id: 'b', mode: 'offline', startedAt: 2_000, endsAt: 62_000, durationSeconds: 60, status: 'interrupted' });
    store.appendEvent({ type: 'focus-lost', at, sessionId: 'a' });
    store.appendEvent({ type: 'focus-lost', at, sessionId: 'a' });
    store.appendEvent({ type: 'connection-lost', at, sessionId: 'a' });
    store.appendEvent({ type: 'session-interrupted', at, sessionId: 'a' });
    store.appendEvent({ type: 'session-resumed', at, sessionId: 'a' });
    store.appendEvent({ type: 'session-finished', at, sessionId: 'a', detail: 'completed' });
    store.appendEvent({ type: 'focus-lost', at, sessionId: 'b' });
    store.appendEvent({ type: 'session-interrupted', at, sessionId: 'b' });

    const history = listSessionHistory(db);
    expect(history.map(h => h.id)).toEqual(['b', 'a']);
    expect(history[1]).toMatchObject({
      mode: 'online',
      status: 'finished',
      focusLost: 2,
      connectionLost: 1,
      interruptions: 1,
      endReason: 'completed',
    });
    expect(history[0]).toMatchObject({ status: 'interrupted', focusLost: 1, interruptions: 1, endReason: null });
  });

  it('sin sesiones devuelve una lista vacía', () => {
    expect(listSessionHistory(setup().db)).toEqual([]);
  });
});
