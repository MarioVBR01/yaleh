/**
 * "Tus sesiones pasadas" en el paso Material de la web.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState, type UploadedFile } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import DropzonePhase from './DropzonePhase';

const mocks = vi.hoisted(() => ({
  listPastSessions: vi.fn(),
  discardEmptyDraft: vi.fn(async () => {}),
  loadRemoteSources: vi.fn(),
}));

vi.mock('../firebase/sessions', () => ({ listPastSessions: mocks.listPastSessions, discardEmptyDraft: mocks.discardEmptyDraft }));
vi.mock('../data/sources', async importOriginal => ({
  ...(await importOriginal<typeof import('../data/sources')>()),
  loadRemoteSources: mocks.loadRemoteSources,
}));

function Probe() {
  const { state } = useApp();
  return (
    <>
      <output data-testid="phase">{state.phase}</output>
      <output data-testid="workspace">{state.workspaceId}</output>
      <output data-testid="files">{state.uploadedFiles.map(f => f.name).join(',')}</output>
      <output data-testid="duration">{state.sessionDuration}</output>
    </>
  );
}

function renderDropzone(overrides: Partial<AppState> = {}) {
  render(
    <AppProvider initial={{ ...initialState, phase: 'dropzone', workspaceId: 'borrador', session: { ...initialState.session, uid: 'u1' }, ...overrides }}>
      <DropzonePhase />
      <Probe />
    </AppProvider>
  );
}

const past = {
  id: 's1',
  lastExportedAt: new Date(2026, 10, 9, 8, 5),
  durationSeconds: 3000,
  sourceNames: ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => uninstallElectronMock());

describe('Tus sesiones pasadas', () => {
  it('cada fila tiene la fecha, hasta dos archivos y "+N más", y la duración en minutos', async () => {
    mocks.listPastSessions.mockResolvedValueOnce([past, { ...past, id: 's2', sourceNames: ['solo.pdf'] }, { ...past, id: 's3', sourceNames: [] }]);
    renderDropzone();

    const rows = await screen.findAllByTestId('past-session');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('a.pdf, b.pdf +2 más')).toBeTruthy();
    expect(within(rows[0]).getByText('09/11/2026 08:05 · 50 min')).toBeTruthy();
    expect(within(rows[1]).getByText('solo.pdf')).toBeTruthy();
    expect(within(rows[2]).getByText('Sin archivos')).toBeTruthy();
    expect(mocks.listPastSessions).toHaveBeenCalledWith('u1');
  });

  it('sin sesiones lo dice', async () => {
    mocks.listPastSessions.mockResolvedValueOnce([]);
    renderDropzone();
    expect(await screen.findByText('Aún no has descargado ninguna sesión.')).toBeTruthy();
  });

  it('mientras carga muestra un esqueleto', () => {
    mocks.listPastSessions.mockReturnValueOnce(new Promise(() => {}));
    renderDropzone();
    expect(screen.getByTestId('past-sessions-loading')).toBeTruthy();
  });

  it('si falla ofrece reintentar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.listPastSessions.mockRejectedValueOnce(new Error('sin red'));
    renderDropzone();
    expect(await screen.findByText('No se pudieron cargar tus sesiones.')).toBeTruthy();

    mocks.listPastSessions.mockResolvedValueOnce([past]);
    fireEvent.click(screen.getByText('Reintentar'));
    expect(await screen.findAllByTestId('past-session')).toHaveLength(1);
  });

  it('"Usar de nuevo" va a Confirmar con sus archivos y su duración, y descarta el borrador vacío', async () => {
    mocks.listPastSessions.mockResolvedValueOnce([past]);
    mocks.loadRemoteSources.mockResolvedValueOnce([{ id: 'f1', name: 'a.pdf', size: 10, type: 'application/pdf', status: 'ready' }]);
    renderDropzone();

    fireEvent.click(await screen.findByRole('button', { name: /Usar de nuevo/ }));

    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('confirm-session'));
    expect(mocks.loadRemoteSources).toHaveBeenCalledWith('u1', 's1');
    expect(screen.getByTestId('workspace').textContent).toBe('s1');
    expect(screen.getByTestId('files').textContent).toBe('a.pdf');
    expect(screen.getByTestId('duration').textContent).toBe('3000');
    expect(mocks.discardEmptyDraft).toHaveBeenCalledWith('u1', 'borrador');
  });

  it('con archivos ya cargados no descarta el borrador', async () => {
    mocks.listPastSessions.mockResolvedValueOnce([past]);
    mocks.loadRemoteSources.mockResolvedValueOnce([]);
    renderDropzone({ uploadedFiles: [{ id: 'x', name: 'x.pdf', size: 1, type: 'application/pdf', status: 'ready' }] as UploadedFile[] });

    fireEvent.click(await screen.findByRole('button', { name: /Usar de nuevo/ }));

    await waitFor(() => expect(screen.getByTestId('phase').textContent).toBe('confirm-session'));
    expect(mocks.discardEmptyDraft).not.toHaveBeenCalled();
  });

  it('si no se puede abrir, se queda en Material con un aviso', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.listPastSessions.mockResolvedValueOnce([past]);
    mocks.loadRemoteSources.mockRejectedValueOnce(new Error('sin red'));
    renderDropzone();

    fireEvent.click(await screen.findByRole('button', { name: /Usar de nuevo/ }));

    expect(await screen.findByText('No se pudo abrir esa sesión. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
  });

  it('en el escritorio no aparece', () => {
    createElectronMock().install();
    renderDropzone();
    expect(screen.queryByText('Tus sesiones pasadas')).toBeNull();
    expect(mocks.listPastSessions).not.toHaveBeenCalled();
  });
});
