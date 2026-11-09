/**
 * "Mis sesiones", la pantalla principal de la web.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import type { MySession } from '../firebase/sessions';
import { initialState } from '../store/appStore';
import SessionsHomePhase from './SessionsHomePhase';

const mocks = vi.hoisted(() => ({
  listMySessions: vi.fn(),
  createDraftSession: vi.fn(async () => 'nueva'),
  renameSession: vi.fn(async (_u: string, _s: string, title: string) => title),
  deleteSession: vi.fn(async () => {}),
  markSessionExported: vi.fn(async () => {}),
  loadRemoteSources: vi.fn(),
  buildSessionFileBlob: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('../firebase/sessions', () => ({
  SESSION_TITLE_MAX: 60,
  listMySessions: mocks.listMySessions,
  createDraftSession: mocks.createDraftSession,
  renameSession: mocks.renameSession,
  deleteSession: mocks.deleteSession,
  markSessionExported: mocks.markSessionExported,
}));
vi.mock('../data/sources', () => ({ loadRemoteSources: mocks.loadRemoteSources }));
vi.mock('../data/workspace', () => ({ getWorkspaceStore: (s: { workspaceId: string }) => ({ forWorkspace: s.workspaceId }) }));
vi.mock('../lib/session-file', () => ({ buildSessionFileBlob: mocks.buildSessionFileBlob, downloadBlob: mocks.downloadBlob }));

const date = new Date(2026, 10, 9, 8, 5);

function session(overrides: Partial<MySession> = {}): MySession {
  return {
    id: 's1',
    title: 'Parcial de biología',
    status: 'exported',
    durationSeconds: 2700,
    sourceCount: 3,
    sourceNames: ['células.pdf', 'b.docx', 'c.txt'],
    totalSize: 100,
    updatedAt: date,
    lastExportedAt: date,
    exportCount: 2,
    ...overrides,
  };
}

const draft = session({ id: 's2', title: 'Álgebra', status: 'draft', durationSeconds: null, sourceCount: 1, sourceNames: ['Matrices.docx'], exportCount: 0, updatedAt: new Date(2026, 0, 2), lastExportedAt: null });
const files = [{ id: 'f1', name: 'células.pdf', size: 10, type: 'application/pdf', status: 'ready' }];

function Probe() {
  const { state } = useApp();
  return <output data-testid="probe">{`${state.phase}|${state.workspaceId}|${state.uploadedFiles.map(f => f.name).join(',')}|${state.sessionDuration}`}</output>;
}

function renderHome() {
  render(
    <AppProvider initial={{ ...initialState, phase: 'sessions-home', session: { ...initialState.session, uid: 'u1' } }}>
      <SessionsHomePhase />
      <Probe />
    </AppProvider>
  );
}

function setPhone(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    query => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
}

const probe = () => screen.getByTestId('probe').textContent;
const openMenu = async (title: string) => fireEvent.click(await screen.findByRole('button', { name: `Opciones de ${title}` }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.listMySessions.mockResolvedValue([session(), draft]);
  mocks.loadRemoteSources.mockResolvedValue(files);
});

afterEach(() => vi.restoreAllMocks());

describe('Mis sesiones', () => {
  it('vista lista: título, archivos, duración, fecha, estado e ícono del primer archivo', async () => {
    renderHome();
    const rows = await screen.findAllByTestId('session-row');
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.getByText('Parcial de biología')).toBeTruthy();
    expect(first.getByText('3 archivos')).toBeTruthy();
    expect(first.getByText('45 min')).toBeTruthy();
    expect(first.getByText('9 nov 2026')).toBeTruthy();
    expect(first.getByText(/Descargada · 2 veces/)).toBeTruthy();
    expect(first.getByTestId('session-icon').dataset.kind).toBe('pdf');
    const second = within(rows[1]);
    expect(second.getByText('1 archivo')).toBeTruthy();
    expect(second.getByText('Sin definir')).toBeTruthy();
    expect(second.getByText('Borrador')).toBeTruthy();
    expect(second.getByTestId('session-icon').dataset.kind).toBe('word');
    expect(mocks.listMySessions).toHaveBeenCalledWith('u1');
  });

  it('descargada una sola vez no muestra el número', async () => {
    mocks.listMySessions.mockResolvedValue([session({ exportCount: 1 })]);
    renderHome();
    expect((await screen.findByText(/Descargada/)).textContent).toBe('Descargada');
  });

  it('una sesión sin título se ve como "Sesión sin título"', async () => {
    mocks.listMySessions.mockResolvedValue([session({ title: null })]);
    renderHome();
    expect(await screen.findByText('Sesión sin título')).toBeTruthy();
  });

  it('vista cuadrícula: tarjetas con "3 archivos · 45 min"; la elección se recuerda', async () => {
    renderHome();
    await screen.findAllByTestId('session-row');
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrícula' }));
    const cards = screen.getAllByTestId('session-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('3 archivos · 45 min')).toBeTruthy();
    expect(localStorage.getItem('yaleh-sessions-view')).toBe('grid');
  });

  it('abre en la vista recordada', async () => {
    localStorage.setItem('yaleh-sessions-view', 'grid');
    renderHome();
    expect(await screen.findAllByTestId('session-card')).toHaveLength(2);
  });

  it('si el almacenamiento falla, funciona igual', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    renderHome();
    await screen.findAllByTestId('session-row');
    fireEvent.click(screen.getByRole('button', { name: 'Cuadrícula' }));
    expect(screen.getAllByTestId('session-card')).toHaveLength(2);
  });

  it('en el celular siempre es cuadrícula, sin selector de vista', async () => {
    setPhone(true);
    renderHome();
    expect(await screen.findAllByTestId('session-card')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Lista' })).toBeNull();
  });

  it('busca por título y por nombre de archivo, sin importar las tildes', async () => {
    renderHome();
    await screen.findAllByTestId('session-row');
    const search = screen.getByLabelText('Buscar sesiones');
    fireEvent.change(search, { target: { value: 'algebra' } });
    expect(screen.getAllByTestId('session-row')).toHaveLength(1);
    expect(screen.getByText('Álgebra')).toBeTruthy();
    fireEvent.change(search, { target: { value: 'CELULAS' } });
    expect(screen.getByText('Parcial de biología')).toBeTruthy();
    fireEvent.change(search, { target: { value: 'nada de esto' } });
    expect(screen.getByText('Ninguna sesión coincide con tu búsqueda.')).toBeTruthy();
  });

  it('ordena por recientes y por nombre', async () => {
    renderHome();
    const titles = () => screen.getAllByTestId('session-row').map(r => within(r).getAllByRole('button')[0].textContent);
    await screen.findAllByTestId('session-row');
    expect(titles()).toEqual(['Parcial de biología', 'Álgebra']);
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'name' } });
    expect(titles()).toEqual(['Álgebra', 'Parcial de biología']);
  });

  it('sin sesiones muestra el estado vacío con "Nueva sesión"', async () => {
    mocks.listMySessions.mockResolvedValue([]);
    renderHome();
    expect(await screen.findByText('Aún no tienes sesiones.')).toBeTruthy();
    expect(screen.getByText('Crea la primera: sube tus apuntes y elige cuánto vas a estudiar.')).toBeTruthy();
    expect(screen.getAllByText('Nueva sesión')).toHaveLength(1);
    expect(screen.getByTestId('yaleh-logo')).toBeTruthy();
  });

  it('mientras carga muestra un esqueleto', () => {
    mocks.listMySessions.mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(screen.getByTestId('sessions-loading')).toBeTruthy();
  });

  it('si falla ofrece reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.listMySessions.mockRejectedValueOnce(new Error('sin red'));
    renderHome();
    expect(await screen.findByText('No se pudieron cargar tus sesiones.')).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findAllByTestId('session-row')).toHaveLength(2);
  });

  it('"Nueva sesión" crea el borrador y va a Material', async () => {
    renderHome();
    await screen.findAllByTestId('session-row');
    fireEvent.click(screen.getByText('Nueva sesión'));
    await waitFor(() => expect(probe()).toBe('dropzone|nueva||0'));
    expect(mocks.createDraftSession).toHaveBeenCalledWith('u1');
  });
});

describe('Abrir una sesión', () => {
  it('con archivos y duración va a Confirmar', async () => {
    renderHome();
    fireEvent.click((await screen.findAllByTestId('session-row'))[0]);
    await waitFor(() => expect(probe()).toBe('confirm-session|s1|células.pdf|2700'));
    expect(mocks.loadRemoteSources).toHaveBeenCalledWith('u1', 's1');
  });

  it('con archivos y sin duración va a Duración', async () => {
    renderHome();
    fireEvent.click((await screen.findAllByTestId('session-row'))[1]);
    await waitFor(() => expect(probe()).toBe('timer-select|s2|células.pdf|0'));
  });

  it('sin archivos va a Material', async () => {
    mocks.loadRemoteSources.mockResolvedValue([]);
    renderHome();
    fireEvent.click((await screen.findAllByTestId('session-row'))[1]);
    await waitFor(() => expect(probe()).toBe('dropzone|s2||0'));
  });

  it('si no se puede abrir, avisa y se queda', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.loadRemoteSources.mockRejectedValueOnce(new Error('sin red'));
    renderHome();
    fireEvent.click((await screen.findAllByTestId('session-row'))[0]);
    expect(await screen.findByText('No se pudo abrir esa sesión. Inténtalo de nuevo.')).toBeTruthy();
    expect(probe()).toMatch(/^sessions-home/);
  });
});

describe('Menú de cada sesión', () => {
  it('tiene las cuatro opciones y abrirlo no abre la sesión', async () => {
    renderHome();
    await openMenu('Parcial de biología');
    const items = screen.getAllByRole('menuitem').map(i => i.textContent?.trim());
    expect(items).toEqual(['Abrir', 'Descargar .yaleh', 'Cambiar nombre', 'Eliminar']);
    expect(probe()).toMatch(/^sessions-home/);
  });

  it('Escape lo cierra', async () => {
    renderHome();
    await openMenu('Parcial de biología');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('descargar genera un .yaleh nuevo con esas fuentes y esa duración, sin pasar por Confirmar', async () => {
    mocks.buildSessionFileBlob.mockResolvedValue({ blob: new Blob(['{}']), fileName: 'YALEH sesión.yaleh', sources: [{ name: 'células.pdf', size: 10 }] });
    renderHome();
    await openMenu('Parcial de biología');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descargar .yaleh' }));

    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalled());
    const [target, store] = mocks.buildSessionFileBlob.mock.calls[0];
    expect(target).toMatchObject({ workspaceId: 's1', sessionDuration: 2700, uploadedFiles: files });
    expect(store).toEqual({ forWorkspace: 's1' });
    expect(mocks.markSessionExported).toHaveBeenCalledWith('u1', 's1', { durationSeconds: 2700, sources: [{ name: 'células.pdf', size: 10 }] });
    expect(await screen.findByText(/Se descargó YALEH sesión\.yaleh/)).toBeTruthy();
    expect(probe()).toMatch(/^sessions-home/);
    expect(screen.getByText(/Descargada · 3 veces/)).toBeTruthy();
  });

  it('no se puede descargar sin duración o sin archivos', async () => {
    mocks.listMySessions.mockResolvedValue([session({ id: 'a', title: 'Sin duración', durationSeconds: null }), session({ id: 'b', title: 'Sin archivos', sourceCount: 0, sourceNames: [] })]);
    renderHome();
    await openMenu('Sin duración');
    expect((screen.getByRole('menuitem', { name: 'Descargar .yaleh' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    await openMenu('Sin archivos');
    expect((screen.getByRole('menuitem', { name: 'Descargar .yaleh' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('si falla la descarga, avisa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.buildSessionFileBlob.mockRejectedValue(new Error('x'));
    renderHome();
    await openMenu('Parcial de biología');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descargar .yaleh' }));
    expect(await screen.findByText('No se pudo crear el archivo de sesión. Inténtalo de nuevo.')).toBeTruthy();
    expect(mocks.markSessionExported).not.toHaveBeenCalled();
  });

  it('cambiar el nombre con el diálogo', async () => {
    renderHome();
    await openMenu('Álgebra');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cambiar nombre' }));
    const input = (await screen.findByLabelText('Nombre de la sesión')) as HTMLInputElement;
    expect(input.value).toBe('Álgebra');
    expect(input.maxLength).toBe(60);
    fireEvent.change(input, { target: { value: 'Álgebra II' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Guardar'));
    });
    expect(mocks.renameSession).toHaveBeenCalledWith('u1', 's2', 'Álgebra II');
    expect(await screen.findByText('Álgebra II')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('no deja guardar un nombre vacío', async () => {
    renderHome();
    await openMenu('Álgebra');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cambiar nombre' }));
    fireEvent.change(await screen.findByLabelText('Nombre de la sesión'), { target: { value: '   ' } });
    expect((screen.getByText('Guardar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('eliminar pide confirmación', async () => {
    renderHome();
    await openMenu('Álgebra');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Se borran los archivos guardados de esta sesión. Los .yaleh que ya descargaste siguen funcionando hasta que venzan.')).toBeTruthy();
    expect(mocks.deleteSession).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(within(dialog).getByText('Eliminar'));
    });
    expect(mocks.deleteSession).toHaveBeenCalledWith('u1', 's2');
    await waitFor(() => expect(screen.getAllByTestId('session-row')).toHaveLength(1));
  });

  it('cancelar no elimina', async () => {
    renderHome();
    await openMenu('Álgebra');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Cancelar'));
    expect(mocks.deleteSession).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getAllByTestId('session-row')).toHaveLength(2);
  });

  it('si no se puede eliminar, avisa en el diálogo y la sesión sigue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.deleteSession.mockRejectedValueOnce(new Error('sin red'));
    renderHome();
    await openMenu('Álgebra');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(within(dialog).getByText('Eliminar'));
    });
    expect(await within(dialog).findByText('No se pudo eliminar la sesión. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getAllByTestId('session-row')).toHaveLength(2);
  });
});
