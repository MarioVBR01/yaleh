/**
 * ORION #39: web → Confirmar (resumen con "Cambiar") y "Tu sesión está lista" (tres pasos).
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState, type UploadedFile } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import ConfirmSessionPhase from './ConfirmSessionPhase';

vi.mock('../data/workspace', () => ({ getWorkspaceStore: () => ({}) }));
vi.mock('../lib/session-file', () => ({
  buildSessionFileBlob: vi.fn(async () => ({
    blob: new Blob(['{}']),
    fileName: 'YALEH sesión 2026-10-16 10-00.yaleh',
    sources: [{ name: 'clase1.pdf', size: 1000 }],
  })),
  downloadBlob: vi.fn(),
}));
const mocks = vi.hoisted(() => ({
  markSessionExported: vi.fn(async () => {}),
  getSessionTitle: vi.fn(async (): Promise<string | null> => 'Parcial'),
  renameSession: vi.fn(async (_u: string, _s: string, title: string) => title),
  discardEmptyDraft: vi.fn(async () => {}),
}));
const { markSessionExported } = mocks;
vi.mock('../firebase/sessions', () => ({ SESSION_TITLE_MAX: 60, ...mocks }));

function Phase() {
  return <output data-testid="phase">{useApp().state.phase}</output>;
}

const files = [
  { id: 'f1', name: 'clase1.pdf', size: 1000, type: 'application/pdf' },
  { id: 'f2', name: 'clase2.pdf', size: 2000, type: 'application/pdf' },
] as unknown as UploadedFile[];

function renderConfirm(overrides: Partial<AppState> = {}) {
  render(
    <AppProvider initial={{ ...initialState, phase: 'confirm-session', sessionDuration: 50 * 60, uploadedFiles: files, ...overrides }}>
      <ConfirmSessionPhase />
      <Phase />
    </AppProvider>
  );
}

afterEach(() => uninstallElectronMock());

describe('Web: la descarga queda en "Mis sesiones"', () => {
  const signedIn = { session: { ...initialState.session, uid: 'u1' }, workspaceId: 'w1' };

  it('registra la sesión descargada con su duración y sus archivos', async () => {
    renderConfirm(signedIn);
    fireEvent.click(screen.getByText('Descargar archivo de sesión'));
    await screen.findByText('Tu sesión está lista');
    expect(screen.getByText(/La encontrarás en Mis sesiones para volver a descargarla\./)).toBeTruthy();
    expect(markSessionExported).toHaveBeenCalledWith('u1', 'w1', { durationSeconds: 50 * 60, sources: [{ name: 'clase1.pdf', size: 1000 }] });
  });

  it('el título se ve arriba y se cambia con el lápiz; Enter guarda', async () => {
    renderConfirm(signedIn);
    const section = screen.getByRole('region', { name: 'Título de la sesión' });
    expect(await within(section).findByText('Parcial')).toBeTruthy();
    fireEvent.click(within(section).getByLabelText('Cambiar el título'));
    const input = within(section).getByLabelText('Título de la sesión');
    fireEvent.change(input, { target: { value: 'Parcial final' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await within(section).findByText('Parcial final')).toBeTruthy();
    expect(mocks.renameSession).toHaveBeenCalledWith('u1', 'w1', 'Parcial final');
  });

  it('Escape cancela el cambio de título', async () => {
    mocks.renameSession.mockClear();
    renderConfirm(signedIn);
    const section = screen.getByRole('region', { name: 'Título de la sesión' });
    await within(section).findByText('Parcial');
    fireEvent.click(within(section).getByLabelText('Cambiar el título'));
    fireEvent.keyDown(within(section).getByLabelText('Título de la sesión'), { key: 'Escape' });
    expect(within(section).getByText('Parcial')).toBeTruthy();
    expect(mocks.renameSession).not.toHaveBeenCalled();
  });

  it('sin título todavía, lo dice', async () => {
    mocks.getSessionTitle.mockResolvedValueOnce(null);
    renderConfirm(signedIn);
    await waitFor(() => expect(mocks.getSessionTitle).toHaveBeenCalled());
    expect(await screen.findByText('Sesión sin título')).toBeTruthy();
  });

  it('si no se puede registrar, la descarga sigue', async () => {
    markSessionExported.mockRejectedValueOnce(new Error('sin permiso'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderConfirm(signedIn);
    fireEvent.click(screen.getByText('Descargar archivo de sesión'));
    expect(await screen.findByText('Tu sesión está lista')).toBeTruthy();
    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    logged.mockRestore();
  });
});

describe('Escritorio: Confirmar en el flujo local', () => {
  it('avisa que es el módulo IA Local', () => {
    createElectronMock().install();
    renderConfirm();
    expect(screen.getByText('Módulo IA Local: sin Gemini ni herramientas de Google.')).toBeTruthy();
  });

  it('el escritorio no muestra el título editable', () => {
    createElectronMock().install();
    renderConfirm({ session: { ...initialState.session, uid: 'u1' }, workspaceId: 'w1' });
    expect(screen.queryByRole('region', { name: 'Título de la sesión' })).toBeNull();
  });

  it('en la web no aparece', () => {
    renderConfirm();
    expect(screen.queryByText(/Módulo IA Local/)).toBeNull();
  });
});

describe('Web: Confirmar y Descargado (ORION #39)', () => {
  it('resumen con Archivos (cantidad y nombres) y Duración, cada uno con "Cambiar"', () => {
    renderConfirm();
    const archivos = screen.getByRole('region', { name: 'Archivos' });
    expect(within(archivos).getByText('2 documentos')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Revisa tu sesión' })).toBeTruthy();
    expect(within(archivos).getByText('clase1.pdf')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Duración' })).getByText('50 minutos')).toBeTruthy();
    expect(screen.getByText(/No vas a poder salir hasta que termine el tiempo/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Cambiar duración'));
    expect(screen.getByTestId('phase').textContent).toBe('timer-select');
  });

  it('"Cambiar" de Archivos vuelve a cargar archivos', () => {
    renderConfirm();
    fireEvent.click(screen.getByLabelText('Cambiar archivos'));
    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
  });

  it('descargar muestra "Tu sesión está lista" con el archivo, los tres pasos y los botones', async () => {
    renderConfirm();
    const download = screen.getByText('Descargar archivo de sesión').closest('button')!;
    expect(download.className).toContain('bg-accent');
    fireEvent.click(download);
    expect(await screen.findByText('Tu sesión está lista')).toBeTruthy();
    expect(screen.getByTestId('session-file-name').textContent).toBe('YALEH sesión 2026-10-16 10-00.yaleh');
    const steps = [...document.querySelectorAll('ol li')].map(li => li.textContent);
    expect(steps).toEqual([
      '1Busca el archivo en tu carpeta de Descargas.',
      '2Ábrelo con doble clic. Se abre YALEH.',
      '3La sesión de 50 minutos empieza y la computadora queda bloqueada.',
    ]);
    expect(screen.getByText('El archivo vale 24 horas y se puede usar una sola vez.')).toBeTruthy();
    expect(screen.getByText('Descargar otra vez')).toBeTruthy();
    // "Ir a Mis sesiones" es el botón oscuro de la maqueta.
    expect(screen.getByText('Ir a Mis sesiones').className).toContain('bg-ink');
    expect(screen.queryByText('Preparar otra sesión')).toBeNull();
    // La web no ofrece la IA Local.
    expect(screen.queryByText(/IA Local|sin conexión|Qwen/i)).toBeNull();

    fireEvent.click(screen.getByText('Ir a Mis sesiones'));
    expect(screen.getByTestId('phase').textContent).toBe('sessions-home');
  });

  it('sin archivos lo dice en el resumen', () => {
    renderConfirm({ uploadedFiles: [] });
    expect(within(screen.getByRole('region', { name: 'Archivos' })).getByText('Sin archivos')).toBeTruthy();
  });
});
