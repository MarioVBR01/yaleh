// @vitest-environment node
/**
 * Pruebas de contrato: las mismas pruebas se ejecutan contra cada
 * implementación de SessionStore (JSON de la fase 2, memoria y SQLite).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonSessionStore, MemorySessionStore, type PersistedSession, type SessionStore } from '../session/store';
import { runMigrations } from './migrations';
import { SqliteSessionStore } from './sqlite-session-store';

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach(fn => fn());
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-contract-'));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Cada fábrica devuelve un almacenamiento vacío y una forma de "reabrirlo" (simula reiniciar la app). */
const implementations: {
  name: string;
  create: () => { store: SessionStore; reopen: () => SessionStore };
}[] = [
  {
    name: 'JsonSessionStore',
    create: () => {
      const dir = tempDir();
      return { store: new JsonSessionStore(dir), reopen: () => new JsonSessionStore(dir) };
    },
  },
  {
    name: 'MemorySessionStore',
    create: () => {
      const store = new MemorySessionStore();
      return { store, reopen: () => store };
    },
  },
  {
    name: 'SqliteSessionStore',
    create: () => {
      const file = path.join(tempDir(), 'test.db');
      const open = () => {
        const db = new DatabaseSync(file);
        runMigrations(db);
        cleanups.unshift(() => db.close());
        return new SqliteSessionStore(db);
      };
      return { store: open(), reopen: open };
    },
  },
];

const session = (overrides: Partial<PersistedSession> = {}): PersistedSession => ({
  id: 's1',
  mode: 'offline',
  startedAt: 1_000,
  endsAt: 61_000,
  durationSeconds: 60,
  status: 'active',
  ...overrides,
});

describe.each(implementations)('Contrato de SessionStore: $name', ({ create }) => {
  it('sin datos: no hay sesión ni eventos', () => {
    const { store } = create();
    expect(store.loadSession()).toBeNull();
    expect(store.listEvents()).toEqual([]);
  });

  it('guarda y lee una sesión, también tras reabrir', () => {
    const { store, reopen } = create();
    store.saveSession(session({ mode: 'online' }));
    expect(store.loadSession()).toEqual(session({ mode: 'online' }));
    expect(reopen().loadSession()).toEqual(session({ mode: 'online' }));
  });

  it('guardar con el mismo id actualiza la sesión', () => {
    const { store } = create();
    store.saveSession(session());
    store.saveSession(session({ status: 'finished' }));
    expect(store.loadSession()?.status).toBe('finished');
  });

  it('devuelve la sesión más reciente', () => {
    const { store } = create();
    store.saveSession(session({ id: 'vieja', startedAt: 1_000 }));
    store.saveSession(session({ id: 'nueva', startedAt: 2_000 }));
    expect(store.loadSession()?.id).toBe('nueva');

    // Actualizar la sesión vieja no la convierte en la más reciente.
    store.saveSession(session({ id: 'vieja', startedAt: 1_000, status: 'interrupted' }));
    expect(store.loadSession()?.id).toBe('nueva');
  });

  it('agrega eventos en orden, con y sin sesión, y los conserva al reabrir', () => {
    const { store, reopen } = create();
    store.appendEvent({ type: 'session-started', at: '2026-09-28T10:00:00.000Z', sessionId: 's1', detail: 'offline, 60s' });
    store.appendEvent({ type: 'focus-lost', at: '2026-09-28T10:00:05.000Z', sessionId: 's1' });
    store.appendEvent({ type: 'invalid-deeplink', at: '2026-09-28T10:00:06.000Z', detail: 'yaleh://x' });

    const expected = [
      { type: 'session-started', at: '2026-09-28T10:00:00.000Z', sessionId: 's1', detail: 'offline, 60s' },
      { type: 'focus-lost', at: '2026-09-28T10:00:05.000Z', sessionId: 's1' },
      { type: 'invalid-deeplink', at: '2026-09-28T10:00:06.000Z', detail: 'yaleh://x' },
    ];
    const normalize = (events: ReturnType<SessionStore['listEvents']>) =>
      events.map(e => ({ ...e, sessionId: e.sessionId ?? undefined })).map(e => JSON.parse(JSON.stringify(e)));

    expect(normalize(store.listEvents())).toEqual(expected);
    expect(normalize(reopen().listEvents())).toEqual(expected);
  });
});
