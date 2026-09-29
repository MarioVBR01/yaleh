// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionController } from '../session/controller';
import { importLegacyJson } from './import-json';
import { runMigrations } from './migrations';
import { SqliteSessionStore } from './sqlite-session-store';

const T0 = Date.parse('2026-09-28T10:00:00Z');

let dir: string;
let db: DatabaseSync;
let store: SqliteSessionStore;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-import-'));
  db = new DatabaseSync(':memory:');
  runMigrations(db);
  store = new SqliteSessionStore(db);
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Archivos tal como los escribía la fase 2 (sin el campo `mode`). */
function writePhase2Files(status: 'active' | 'finished' = 'active') {
  fs.writeFileSync(
    path.join(dir, 'session.json'),
    JSON.stringify({ id: 'fase2', startedAt: T0, endsAt: T0 + 50 * 60_000, durationSeconds: 3000, status })
  );
  fs.writeFileSync(
    path.join(dir, 'events.json'),
    JSON.stringify([
      { type: 'session-started', at: new Date(T0).toISOString(), sessionId: 'fase2', detail: '3000s' },
      { type: 'focus-lost', at: new Date(T0 + 1000).toISOString(), sessionId: 'fase2' },
      { type: 'dev-release', at: new Date(T0 - 99_000).toISOString(), sessionId: 'otra-sesion-antigua' },
    ])
  );
}

describe('importLegacyJson', () => {
  it('sin archivos de la fase 2 no hace nada', () => {
    expect(importLegacyJson(dir, store)).toEqual({ sessionImported: false, eventsImported: 0 });
    expect(store.loadSession()).toBeNull();
  });

  it('importa la sesión (como offline) y todos los eventos, y renombra los archivos', () => {
    writePhase2Files('finished');

    expect(importLegacyJson(dir, store)).toEqual({ sessionImported: true, eventsImported: 3 });

    expect(store.loadSession()).toEqual({
      id: 'fase2',
      mode: 'offline',
      startedAt: T0,
      endsAt: T0 + 50 * 60_000,
      durationSeconds: 3000,
      status: 'finished',
    });
    expect(store.listEvents().map(e => e.type)).toEqual(['session-started', 'focus-lost', 'dev-release']);
    expect(fs.readdirSync(dir).sort()).toEqual(['events.json.migrated', 'session.json.migrated']);
  });

  it('se ejecuta una sola vez: el segundo arranque no duplica datos', () => {
    writePhase2Files();
    importLegacyJson(dir, store);

    expect(importLegacyJson(dir, store)).toEqual({ sessionImported: false, eventsImported: 0 });
    expect(store.listEvents()).toHaveLength(3);
  });

  it('una sesión activa importada se detecta como interrumpida y se puede retomar', () => {
    writePhase2Files('active');
    importLegacyJson(dir, store);

    vi.useFakeTimers();
    vi.setSystemTime(T0 + 20 * 60_000);
    const controller = new SessionController({
      store,
      minSeconds: 60,
      maxSeconds: 180 * 60,
      lock: vi.fn(),
      unlock: vi.fn(),
      onTick: vi.fn(),
      onEnded: vi.fn(),
    });

    const snapshot = controller.recover();
    expect(snapshot).toMatchObject({ status: 'resumable', sessionId: 'fase2', mode: 'offline', remainingSeconds: 30 * 60 });
    expect(store.listEvents().at(-1)).toMatchObject({ type: 'session-interrupted', sessionId: 'fase2' });
  });

  it('si solo existe events.json, importa los eventos', () => {
    fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify([{ type: 'focus-lost', at: '2026-09-01T00:00:00.000Z' }]));
    expect(importLegacyJson(dir, store)).toEqual({ sessionImported: false, eventsImported: 1 });
    expect(fs.existsSync(path.join(dir, 'events.json.migrated'))).toBe(true);
  });
});
