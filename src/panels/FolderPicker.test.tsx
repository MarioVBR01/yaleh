/**
 * ORION #22: exportar eligiendo la carpeta con el selector propio de YALEH (nunca la ventana de Windows).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import FolderPicker from './FolderPicker';
import HistoryPanel from './HistoryPanel';

afterEach(() => uninstallElectronMock());

const session: SessionHistoryEntry = {
  id: 's1', mode: 'offline', startedAt: Date.now(), endsAt: Date.now(), durationSeconds: 600, studiedSeconds: 600,
  status: 'finished', focusLost: 0, connectionLost: 0, interruptions: 0, endReason: 'completed', files: [],
};
const current = () => screen.getByTestId('current-folder').textContent;

describe('FolderPicker', () => {
  it('arranca en la carpeta predeterminada, solo muestra carpetas y se navega', async () => {
    createElectronMock().install();
    const onSelect = vi.fn();
    render(<FolderPicker title="Elegir" onSelect={onSelect} onCancel={() => {}} />);
    await waitFor(() => expect(current()).toBe('C:\\Users\\x\\Documents\\YALEH'));
    fireEvent.click(screen.getByText('Subir'));
    await waitFor(() => expect(current()).toBe('C:\\Users\\x\\Documents'));
    fireEvent.click(screen.getByText('Tareas'));
    await waitFor(() => expect(current()).toBe('C:\\Users\\x\\Documents\\Tareas'));
    fireEvent.click(screen.getByText('Unidad E:'));
    await waitFor(() => expect(current()).toBe('E:\\'));
    fireEvent.click(screen.getByText('Guardar aquí'));
    expect(onSelect).toHaveBeenCalledWith('E:\\');
  });

  it('no tiene menú contextual', async () => {
    createElectronMock().install();
    render(<FolderPicker title="Elegir" onSelect={() => {}} onCancel={() => {}} />);
    const dialog = screen.getByRole('dialog');
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('Exportar el historial eligiendo la carpeta', () => {
  it('cancelar no guarda nada ni muestra error', async () => {
    const mock = createElectronMock({ history: [session] });
    mock.install();
    render(<HistoryPanel />);
    fireEvent.click(await screen.findByText('Exportar PDF'));
    fireEvent.click(await screen.findByText('Cancelar'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mock.api.exportSessionHistoryPdf).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el mensaje final muestra la ruta elegida', async () => {
    const mock = createElectronMock({ history: [session] });
    mock.api.exportSessionHistoryPdf = vi.fn(async (_filter, directory?: string) => ({ ok: true as const, path: `${directory}\\Historial de sesiones.pdf` }));
    mock.install();
    render(<HistoryPanel />);
    fireEvent.click(await screen.findByText('Exportar PDF'));
    await waitFor(() => expect(current()).toContain('YALEH'));
    fireEvent.click(screen.getByText('Unidad E:'));
    await waitFor(() => expect(current()).toBe('E:\\'));
    fireEvent.click(screen.getByText('Guardar aquí'));
    expect(await screen.findByText('Guardado en E:\\\\Historial de sesiones.pdf')).toBeTruthy();
  });
});
