// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonSessionStore, type PersistedSession } from './store';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaleh-store-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const session: PersistedSession = {
  id: 'abc',
  startedAt: 1,
  endsAt: 2,
  durationSeconds: 60,
  status: 'active',
};

describe('JsonSessionStore', () => {
  it('devuelve null si no hay sesión guardada', () => {
    expect(new JsonSessionStore(dir).loadSession()).toBeNull();
  });

  it('guarda y lee la sesión entre instancias (sobrevive a un reinicio)', () => {
    new JsonSessionStore(dir).saveSession(session);
    expect(new JsonSessionStore(dir).loadSession()).toEqual(session);
  });

  it('agrega eventos en orden', () => {
    const store = new JsonSessionStore(dir);
    store.appendEvent({ type: 'focus-lost', at: '2026-09-28T10:00:00.000Z' });
    store.appendEvent({ type: 'dev-release', at: '2026-09-28T10:00:01.000Z' });
    expect(new JsonSessionStore(dir).listEvents().map(e => e.type)).toEqual(['focus-lost', 'dev-release']);
  });

  it('tolera un archivo dañado', () => {
    fs.writeFileSync(path.join(dir, 'session.json'), '{ no es json');
    fs.writeFileSync(path.join(dir, 'events.json'), '"no es una lista"');
    const store = new JsonSessionStore(dir);
    expect(store.loadSession()).toBeNull();
    expect(store.listEvents()).toEqual([]);
  });
});
