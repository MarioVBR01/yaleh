/**
 * ORION #39: web → Confirmar (resumen con "Cambiar") y "Tu sesión está lista" (tres pasos).
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState, type UploadedFile } from '../store/appStore';
import ConfirmSessionPhase from './ConfirmSessionPhase';

vi.mock('../data/workspace', () => ({ getWorkspaceStore: () => ({}) }));
vi.mock('../lib/session-file', () => ({
  buildSessionFileBlob: vi.fn(async () => ({ blob: new Blob(['{}']), fileName: 'YALEH sesión 2026-10-16 10-00.yaleh' })),
  downloadBlob: vi.fn(),
}));

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

describe('Web: Confirmar y Descargado (ORION #39)', () => {
  it('resumen con Archivos (cantidad y nombres) y Duración, cada uno con "Cambiar"', () => {
    renderConfirm();
    const archivos = screen.getByRole('region', { name: 'Archivos' });
    expect(within(archivos).getByText('2 archivos')).toBeTruthy();
    expect(within(archivos).getByText('clase1.pdf')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Duración' })).getByText('50 minutos')).toBeTruthy();
    expect(screen.getByText(/No podrás salir hasta que termine el tiempo/)).toBeTruthy();

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
    expect(download.className).toContain('bg-brand');
    fireEvent.click(download);
    expect(await screen.findByText('Tu sesión está lista')).toBeTruthy();
    expect(screen.getByTestId('session-file-name').textContent).toBe('YALEH sesión 2026-10-16 10-00.yaleh');
    const steps = [...document.querySelectorAll('ol li')].map(li => li.textContent);
    expect(steps).toEqual([
      '1Buscalo en tu carpeta Descargas.',
      '2Abrilo con doble clic.',
      '3La sesión de 50 minutos empieza y la computadora queda bloqueada.',
    ]);
    expect(screen.getByText('El archivo vale 24 horas y se puede usar una sola vez.')).toBeTruthy();
    expect(screen.getByText('Descargar otra vez')).toBeTruthy();
    // La web no ofrece el asistente sin conexión.
    expect(screen.queryByText(/sin conexión|Qwen/i)).toBeNull();

    fireEvent.click(screen.getByText('Preparar otra sesión'));
    expect(screen.getByTestId('phase').textContent).toBe('dropzone');
  });

  it('sin archivos lo dice en el resumen', () => {
    renderConfirm({ uploadedFiles: [] });
    expect(within(screen.getByRole('region', { name: 'Archivos' })).getByText('Sin archivos')).toBeTruthy();
  });
});
