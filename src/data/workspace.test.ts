/**
 * Web: agregar o quitar una fuente actualiza el documento de la sesión ("Mis sesiones").
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState } from '../store/appStore';

const refreshSessionSummary = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../firebase/sessions', () => ({ refreshSessionSummary }));
vi.mock('./sources', () => ({ saveRemoteSource: vi.fn(async () => {}), removeRemoteSource: vi.fn(async () => {}) }));

const { getWorkspaceStore } = await import('./workspace');

const store = () => getWorkspaceStore({ ...initialState, workspaceId: 'w1', session: { ...initialState.session, uid: 'u1' } })!;
const source = { id: 'f1', name: 'a.pdf', type: 'application/pdf', size: 1 };

beforeEach(() => refreshSessionSummary.mockClear());

describe('Almacenamiento de la web', () => {
  it('agregar una fuente actualiza la sesión', async () => {
    await store().addSource(source, 'texto');
    expect(refreshSessionSummary).toHaveBeenCalledWith('u1', 'w1');
  });

  it('quitar una fuente actualiza la sesión', async () => {
    await store().removeSource('f1');
    expect(refreshSessionSummary).toHaveBeenCalledWith('u1', 'w1');
  });

  it('si falla el resumen, la fuente igual queda guardada', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    refreshSessionSummary.mockRejectedValueOnce(new Error('sin red'));
    await expect(store().addSource(source, 'texto')).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
