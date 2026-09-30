// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createSessionFile, type SessionFileSource } from '../shared/session-file';
import type { SessionMode, SessionSnapshot } from '../shared/ipc-types';
import { findSessionFileInArgv, openSessionFile, sha256Hex, type OpenSessionFileDeps } from './session-file-service';

const NOW = new Date('2026-09-29T15:30:00Z');

async function rawFile(overrides: { sessionId?: string; now?: Date } = {}) {
  const file = await createSessionFile(
    {
      sessionId: overrides.sessionId ?? 'sesion123',
      durationSeconds: 120,
      createdBy: { name: 'Mario', email: 'mario@tecba.edu.bo' },
      sources: [{ id: 'f1', name: 'apuntes.txt', type: 'text/plain', size: 10, text: 'hola' }],
      now: overrides.now ?? NOW,
    },
    sha256Hex
  );
  return JSON.stringify(file);
}

function deps(overrides: Partial<OpenSessionFileDeps> = {}) {
  const used = new Set<string>();
  const d: OpenSessionFileDeps = {
    isLocked: vi.fn(() => false),
    isUsed: vi.fn((id: string) => used.has(id)),
    saveSources: vi.fn((_id: string, sources: SessionFileSource[]) =>
      sources.map(s => ({ id: s.id, name: s.name, type: s.type, size: s.size, charCount: s.text.length, createdAt: '' }))
    ),
    currentMode: vi.fn(() => 'online' as const),
    start: vi.fn((durationSeconds: number, mode: SessionMode, sessionId: string): SessionSnapshot => {
      used.add(sessionId);
      return { status: 'active', sessionId, mode, durationSeconds, remainingSeconds: durationSeconds };
    }),
    now: () => NOW,
    ...overrides,
  };
  return d;
}

describe('openSessionFile', () => {
  it('archivo válido: guarda las fuentes y empieza la sesión con el modo de la conexión', async () => {
    const d = deps();
    const result = await openSessionFile(await rawFile(), d);

    expect(result).toMatchObject({ ok: true, snapshot: { status: 'active', sessionId: 'sesion123', mode: 'online' } });
    expect(d.saveSources).toHaveBeenCalledWith('sesion123', [expect.objectContaining({ id: 'f1', text: 'hola' })]);
    expect(d.start).toHaveBeenCalledWith(120, 'online', 'sesion123');
  });

  it('sin conexión la sesión empieza en modo offline', async () => {
    const d = deps({ currentMode: () => 'offline' });
    await openSessionFile(await rawFile(), d);
    expect(d.start).toHaveBeenCalledWith(120, 'offline', 'sesion123');
  });

  it('uso único: el mismo archivo no se puede abrir dos veces', async () => {
    const d = deps();
    expect((await openSessionFile(await rawFile(), d)).ok).toBe(true);
    const second = await openSessionFile(await rawFile(), d);
    expect(second).toMatchObject({ ok: false, message: expect.stringMatching(/ya se usó/) });
    expect(d.start).toHaveBeenCalledTimes(1);
  });

  it('caducado: muestra el mensaje y no bloquea', async () => {
    const d = deps({ now: () => new Date(NOW.getTime() + 25 * 3_600_000) });
    const result = await openSessionFile(await rawFile(), d);
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/caducó/) });
    expect(d.start).not.toHaveBeenCalled();
    expect(d.saveSources).not.toHaveBeenCalled();
  });

  it('archivo inválido: no guarda nada ni bloquea', async () => {
    const d = deps();
    expect(await openSessionFile('{"format":"otro"}', d)).toMatchObject({ ok: false });
    expect(d.start).not.toHaveBeenCalled();
  });

  it('con una sesión en curso no se abre otro archivo', async () => {
    const d = deps({ isLocked: () => true });
    expect(await openSessionFile(await rawFile(), d)).toMatchObject({ ok: false, message: 'Ya hay una sesión en curso.' });
    expect(d.start).not.toHaveBeenCalled();
  });
});

describe('findSessionFileInArgv', () => {
  it('encuentra el .yaleh entre los argumentos de Windows', () => {
    expect(findSessionFileInArgv(['C:\\YALEH\\YALEH.exe', '--flag', 'C:\\Users\\x\\Downloads\\YALEH-sesion.YALEH'])).toBe(
      'C:\\Users\\x\\Downloads\\YALEH-sesion.YALEH'
    );
    expect(findSessionFileInArgv(['electron.exe', '.', '--dev-server'])).toBeUndefined();
  });
});
