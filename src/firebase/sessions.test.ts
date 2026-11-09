/**
 * Sesiones pasadas de la web, con Firestore simulado.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fs = vi.hoisted(() => ({
  collection: vi.fn((...path: unknown[]) => ({ path })),
  deleteDoc: vi.fn(async () => {}),
  doc: vi.fn((...path: unknown[]) => ({ path })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  increment: vi.fn((n: number) => ({ increment: n })),
  limit: vi.fn((n: number) => ({ limit: n })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  serverTimestamp: vi.fn(() => 'AHORA'),
  setDoc: vi.fn(async () => {}),
}));

vi.mock('firebase/firestore', () => fs);
vi.mock('./app', () => ({ getDb: () => 'db' }));

const { discardEmptyDraft, listPastSessions, markSessionExported } = await import('./sessions');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('markSessionExported', () => {
  it('marca la sesión como exportada, sin pisar el resto del documento', async () => {
    await markSessionExported('u1', 's1', {
      durationSeconds: 3000,
      sources: [
        { name: 'a.pdf', size: 100 },
        { name: 'b.pdf', size: 250 },
      ],
    });

    expect(fs.doc).toHaveBeenCalledWith('db', 'users', 'u1', 'sessions', 's1');
    expect(fs.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        status: 'exported',
        durationSeconds: 3000,
        lastExportedAt: 'AHORA',
        exportCount: { increment: 1 },
        sourceNames: ['a.pdf', 'b.pdf'],
        sourceCount: 2,
        totalSize: 350,
      },
      { merge: true }
    );
  });
});

describe('listPastSessions', () => {
  it('pide las últimas 20 por fecha de descarga y convierte los datos', async () => {
    const date = new Date(2026, 10, 9, 8, 5);
    fs.getDocs.mockResolvedValueOnce({
      docs: [
        { id: 's1', data: () => ({ lastExportedAt: { toDate: () => date }, durationSeconds: 3000, sourceNames: ['a.pdf'] }) },
        { id: 's2', data: () => ({}) },
      ],
    });

    await expect(listPastSessions('u1')).resolves.toEqual([
      { id: 's1', lastExportedAt: date, durationSeconds: 3000, sourceNames: ['a.pdf'] },
      { id: 's2', lastExportedAt: null, durationSeconds: 0, sourceNames: [] },
    ]);
    expect(fs.collection).toHaveBeenCalledWith('db', 'users', 'u1', 'sessions');
    expect(fs.orderBy).toHaveBeenCalledWith('lastExportedAt', 'desc');
    expect(fs.limit).toHaveBeenCalledWith(20);
  });
});

describe('discardEmptyDraft', () => {
  it('borra un borrador sin fuentes', async () => {
    fs.getDoc.mockResolvedValueOnce({ data: () => ({ status: 'draft' }) });
    fs.getDocs.mockResolvedValueOnce({ empty: true });
    await discardEmptyDraft('u1', 's1');
    expect(fs.deleteDoc).toHaveBeenCalledOnce();
  });

  it('no borra un borrador con fuentes', async () => {
    fs.getDoc.mockResolvedValueOnce({ data: () => ({ status: 'draft' }) });
    fs.getDocs.mockResolvedValueOnce({ empty: false });
    await discardEmptyDraft('u1', 's1');
    expect(fs.deleteDoc).not.toHaveBeenCalled();
  });

  it('no toca una sesión ya descargada', async () => {
    fs.getDoc.mockResolvedValueOnce({ data: () => ({ status: 'exported' }) });
    await discardEmptyDraft('u1', 's1');
    expect(fs.getDocs).not.toHaveBeenCalled();
    expect(fs.deleteDoc).not.toHaveBeenCalled();
  });
});
