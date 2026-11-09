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
const sources = vi.hoisted(() => ({ loadRemoteSources: vi.fn(), removeRemoteSource: vi.fn(async () => {}) }));
vi.mock('../data/sources', () => sources);

const {
  createDraftSession,
  deleteSession,
  discardEmptyDraft,
  ensureUserProfile,
  listMySessions,
  markSessionExported,
  refreshSessionSummary,
  renameSession,
  saveSessionDuration,
  titleFromFileName,
} = await import('./sessions');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureUserProfile', () => {
  const user = { uid: 'u1', displayName: 'Ana', email: 'ana@tecba.edu.bo', photoURL: 'foto.png' };
  const profile = { displayName: 'Ana', email: 'ana@tecba.edu.bo', photoURL: 'foto.png', lastLoginAt: 'AHORA' };

  it('el primer ingreso crea la cuenta con createdAt', async () => {
    fs.getDoc.mockResolvedValueOnce({ exists: () => false });
    await ensureUserProfile(user);
    expect(fs.doc).toHaveBeenCalledWith('db', 'users', 'u1');
    expect(fs.setDoc).toHaveBeenCalledWith(expect.anything(), { ...profile, createdAt: 'AHORA' }, { merge: true });
  });

  it('los ingresos siguientes no tocan createdAt', async () => {
    fs.getDoc.mockResolvedValueOnce({ exists: () => true });
    await ensureUserProfile(user);
    expect(fs.setDoc).toHaveBeenCalledWith(expect.anything(), profile, { merge: true });
  });
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
        updatedAt: 'AHORA',
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

  it('no borra un borrador con cambios (ya aparece en Mis sesiones)', async () => {
    fs.getDoc.mockResolvedValueOnce({ data: () => ({ status: 'draft', updatedAt: 'ayer' }) });
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

describe('createDraftSession', () => {
  it('crea la sesión sin updatedAt ni escribir el perfil', async () => {
    await createDraftSession('u1');
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    const data = (fs.setDoc.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(data.status).toBe('draft');
    expect(data.createdAt).toBe('AHORA');
    expect(data).not.toHaveProperty('updatedAt');
  });
});

describe('titleFromFileName', () => {
  it('quita la extensión y limita a 60 caracteres', () => {
    expect(titleFromFileName('Clase 3.final.pdf')).toBe('Clase 3.final');
    expect(titleFromFileName(`${'a'.repeat(80)}.pdf`)).toHaveLength(60);
  });
});

describe('refreshSessionSummary', () => {
  const two = [
    { name: 'Biología.pdf', size: 100 },
    { name: 'clase.docx', size: 50 },
  ];

  it('guarda los archivos y usa el primero como título si no tiene', async () => {
    sources.loadRemoteSources.mockResolvedValueOnce(two);
    fs.getDoc.mockResolvedValueOnce({ data: () => ({}) });
    await refreshSessionSummary('u1', 'a');
    expect(fs.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { sourceCount: 2, sourceNames: ['Biología.pdf', 'clase.docx'], totalSize: 150, updatedAt: 'AHORA', title: 'Biología' },
      { merge: true }
    );
  });

  it('no pisa un título que ya existe', async () => {
    sources.loadRemoteSources.mockResolvedValueOnce(two);
    fs.getDoc.mockResolvedValueOnce({ data: () => ({ title: 'Parcial' }) });
    await refreshSessionSummary('u1', 'b');
    expect((fs.setDoc.mock.calls[0] as unknown[])[1]).not.toHaveProperty('title');
  });

  it('dos actualizaciones seguidas se hacen en orden: la segunda lee después de que escribió la primera', async () => {
    const order: string[] = [];
    fs.getDoc.mockResolvedValue({ data: () => ({ title: 'x' }) });
    sources.loadRemoteSources.mockImplementation(async () => {
      order.push('leer');
      return [];
    });
    fs.setDoc.mockImplementation(async () => {
      order.push('escribir');
    });
    await Promise.all([refreshSessionSummary('u1', 'c'), refreshSessionSummary('u1', 'c')]);
    expect(order).toEqual(['leer', 'escribir', 'leer', 'escribir']);
    sources.loadRemoteSources.mockReset();
    fs.getDoc.mockReset();
    fs.setDoc.mockReset();
    fs.setDoc.mockImplementation(async () => {});
  });

  it('si una falla, la siguiente igual se hace', async () => {
    sources.loadRemoteSources.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce([]);
    fs.getDoc.mockResolvedValue({ data: () => ({}) });
    await expect(refreshSessionSummary('u1', 'd')).rejects.toThrow('sin red');
    await expect(refreshSessionSummary('u1', 'd')).resolves.toBeUndefined();
    fs.getDoc.mockReset();
  });
});

describe('saveSessionDuration', () => {
  it('guarda la duración y la fecha', async () => {
    await saveSessionDuration('u1', 's1', 2700);
    expect(fs.setDoc).toHaveBeenCalledWith(expect.anything(), { durationSeconds: 2700, updatedAt: 'AHORA' }, { merge: true });
  });
});

describe('listMySessions', () => {
  const when = new Date(2026, 10, 9, 8, 5);
  const stamp = { toDate: () => when };
  const row = (id: string, data: Record<string, unknown>) => ({ id, ref: { id }, data: () => data });

  it('pide las últimas 50 por updatedAt y convierte los datos', async () => {
    fs.getDocs.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({
      docs: [
        row('s1', { title: 'Parcial', status: 'exported', durationSeconds: 2700, sourceCount: 2, sourceNames: ['a.pdf', 'b.pdf'], totalSize: 9, updatedAt: stamp, lastExportedAt: stamp, exportCount: 3 }),
        row('s2', { updatedAt: stamp, durationSeconds: null }),
      ],
    });
    const list = await listMySessions('cuenta1');
    expect(fs.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(fs.limit).toHaveBeenCalledWith(50);
    expect(list[0]).toEqual({ id: 's1', title: 'Parcial', status: 'exported', durationSeconds: 2700, sourceCount: 2, sourceNames: ['a.pdf', 'b.pdf'], totalSize: 9, updatedAt: when, lastExportedAt: when, exportCount: 3 });
    expect(list[1]).toMatchObject({ id: 's2', title: null, status: 'draft', durationSeconds: null, sourceCount: 0, exportCount: 0 });
  });

  it('completa una sola vez las sesiones viejas: updatedAt = lastExportedAt y el título del primer archivo', async () => {
    fs.getDocs
      .mockResolvedValueOnce({
        docs: [
          row('vieja', { lastExportedAt: stamp, sourceNames: ['Física I.pdf'] }),
          row('nueva', { lastExportedAt: stamp, updatedAt: stamp }),
        ],
      })
      .mockResolvedValue({ docs: [] });
    await listMySessions('cuenta2');
    expect(fs.orderBy).toHaveBeenCalledWith('lastExportedAt', 'desc');
    expect(fs.setDoc).toHaveBeenCalledTimes(1);
    expect(fs.setDoc).toHaveBeenCalledWith({ id: 'vieja' }, { updatedAt: stamp, title: 'Física I' }, { merge: true });

    fs.getDocs.mockClear();
    await listMySessions('cuenta2');
    expect(fs.getDocs).toHaveBeenCalledTimes(1);
    fs.getDocs.mockReset();
  });

  it('si no se pueden completar, lista igual y reintenta la próxima vez', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.getDocs.mockRejectedValueOnce(new Error('sin permiso')).mockResolvedValueOnce({ docs: [row('s1', { updatedAt: stamp })] });
    await expect(listMySessions('cuenta3')).resolves.toHaveLength(1);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
    fs.getDocs.mockResolvedValue({ docs: [] });
    fs.getDocs.mockClear();
    await listMySessions('cuenta3');
    expect(fs.getDocs).toHaveBeenCalledTimes(2);
    fs.getDocs.mockReset();
  });
});

describe('renameSession', () => {
  it('recorta los espacios y limita a 60 caracteres', async () => {
    await expect(renameSession('u1', 's1', `  ${'a'.repeat(70)} `)).resolves.toHaveLength(60);
    await expect(renameSession('u1', 's1', '  Parcial  ')).resolves.toBe('Parcial');
    expect(fs.setDoc).toHaveBeenLastCalledWith(expect.anything(), { title: 'Parcial', updatedAt: 'AHORA' }, { merge: true });
  });

  it('rechaza un título vacío', async () => {
    await expect(renameSession('u1', 's1', '   ')).rejects.toThrow();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});

describe('deleteSession', () => {
  it('borra las fuentes, las notas, los resultados y, al final, el documento', async () => {
    const order: string[] = [];
    fs.collection.mockImplementation((...path: unknown[]) => ({ path }));
    fs.getDocs.mockImplementation((async (col: { path: unknown[] }) => {
      const name = col.path[1];
      if (name === 'sources') return { docs: [{ id: 'f1' }, { id: 'f2' }] };
      if (name === 'notes') return { docs: [{ id: 'n1', ref: 'nota' }] };
      return { docs: [{ id: 'i1', ref: 'resultado' }] };
    }) as never);
    sources.removeRemoteSource.mockImplementation((async (_u: string, _s: string, id: string) => {
      order.push(id);
    }) as never);
    fs.deleteDoc.mockImplementation((async (ref: unknown) => {
      order.push(typeof ref === 'string' ? ref : 'sesión');
    }) as never);

    await deleteSession('u1', 's1');

    expect(sources.removeRemoteSource).toHaveBeenCalledWith('u1', 's1', 'f1');
    expect(order.slice(0, 2).sort()).toEqual(['f1', 'f2']);
    expect(order.slice(2, 4).sort()).toEqual(['nota', 'resultado']);
    expect(order[4]).toBe('sesión');
    fs.getDocs.mockReset();
    fs.deleteDoc.mockReset();
    fs.deleteDoc.mockImplementation(async () => {});
  });
});
