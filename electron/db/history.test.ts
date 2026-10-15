// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { listSessionHistory } from './history';
import { runMigrations } from './migrations';
import { SqliteSessionStore } from './sqlite-session-store';
import { WorkspaceRepository } from './workspace-repository';

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

describe('tiempo estudiado en el historial (ORION #11)', () => {
  it('usa el tiempo medido; en sesiones anteriores lo estima', () => {
    const { db, store } = setup();
    const t0 = Date.parse('2026-10-12T10:00:00Z');
    store.saveSession({ id: 'medida', mode: 'offline', startedAt: t0, endsAt: t0 + 600_000, durationSeconds: 600, status: 'interrupted', studiedSeconds: 240 });
    store.saveSession({ id: 'vieja-completa', mode: 'offline', startedAt: t0 + 1, endsAt: t0, durationSeconds: 900, status: 'finished' });
    store.appendEvent({ type: 'session-finished', at: new Date(t0).toISOString(), sessionId: 'vieja-completa', detail: 'completed' });
    store.saveSession({ id: 'vieja-liberada', mode: 'offline', startedAt: t0 + 2, endsAt: t0, durationSeconds: 900, status: 'finished' });
    store.appendEvent({ type: 'session-finished', at: new Date(t0 + 2 + 300_000).toISOString(), sessionId: 'vieja-liberada', detail: 'dev-release' });
    store.saveSession({ id: 'vieja-cortada', mode: 'offline', startedAt: t0 + 3, endsAt: t0, durationSeconds: 900, status: 'interrupted' });

    const byId = Object.fromEntries(listSessionHistory(db).map(h => [h.id, h.studiedSeconds]));
    expect(byId).toEqual({ medida: 240, 'vieja-completa': 900, 'vieja-liberada': 300, 'vieja-cortada': 0 });
  });
});

describe('archivos de cada sesión (ORION #20)', () => {
  it('lista los archivos cargados en la sesión, en orden; sin archivos, lista vacía', () => {
    const { db, store } = setup();
    const repo = new WorkspaceRepository(db);
    store.saveSession({ id: 'con', mode: 'offline', startedAt: 2, endsAt: 3, durationSeconds: 60, status: 'finished' });
    store.saveSession({ id: 'sin', mode: 'offline', startedAt: 1, endsAt: 2, durationSeconds: 60, status: 'finished' });
    repo.addSource('con', { id: 'a', name: 'clase 1.pdf', type: 'application/pdf', size: 1 }, 'uno');
    repo.addSource('con', { id: 'b', name: 'apuntes, tema 2.txt', type: 'text/plain', size: 1 }, 'dos');
    const byId = Object.fromEntries(listSessionHistory(db).map(h => [h.id, h.files]));
    expect(byId).toEqual({ con: ['clase 1.pdf', 'apuntes, tema 2.txt'], sin: [] });
  });
});
