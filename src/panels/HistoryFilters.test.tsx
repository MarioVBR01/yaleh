/**
 * ORION #23: filtros por fecha y cantidad en el historial; exportar usa lo filtrado.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { filterSessions, localDateKey, parseHistoryFilter } from '@shared/history-filter';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import HistoryPanel from './HistoryPanel';

afterEach(() => uninstallElectronMock());

/** 25 sesiones, una por día desde el 20/10/2026 hacia atrás (más recientes primero). */
const sessions: SessionHistoryEntry[] = Array.from({ length: 25 }, (_, i) => {
  const startedAt = new Date(2026, 9, 20 - i, 10, 0, 0).getTime();
  return {
    id: `s${i}`, mode: 'offline', startedAt, endsAt: startedAt + 600_000, durationSeconds: 600, studiedSeconds: 600,
    status: 'finished', focusLost: 0, connectionLost: 0, interruptions: 0, endReason: 'completed', files: [],
  };
});

const rows = () => document.querySelectorAll('tbody tr').length;

describe('filterSessions y parseHistoryFilter', () => {
  it('filtra por rango inclusivo (hora local) y limita la cantidad', () => {
    const inRange = filterSessions(sessions, { from: '2026-10-10', to: '2026-10-12' });
    expect(inRange.map(s => localDateKey(s.startedAt))).toEqual(['2026-10-12', '2026-10-11', '2026-10-10']);
    expect(filterSessions(sessions, { limit: 10 })).toHaveLength(10);
    expect(filterSessions(sessions, { limit: null })).toHaveLength(25);
  });

  it('valida el filtro que llega por IPC', () => {
    expect(parseHistoryFilter({ from: '2026-10-01', to: '', limit: 20 })).toEqual({ from: '2026-10-01', to: null, limit: 20 });
    expect(parseHistoryFilter(undefined)).toEqual({});
    expect(() => parseHistoryFilter({ from: '1/10/2026' })).toThrow();
    expect(() => parseHistoryFilter({ limit: 15 })).toThrow();
  });
});

describe('HistoryPanel con filtros', () => {
  it('por defecto muestra 10; el desplegable cambia a 20, 30, 50 o todas', async () => {
    createElectronMock({ history: sessions }).install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    expect(rows()).toBe(10);
    fireEvent.change(screen.getByLabelText('Cantidad de sesiones'), { target: { value: '20' } });
    expect(rows()).toBe(20);
    fireEvent.change(screen.getByLabelText('Cantidad de sesiones'), { target: { value: 'all' } });
    expect(rows()).toBe(25);
  });

  it('las fechas se aplican al tocar Buscar; sin resultados lo dice', async () => {
    createElectronMock({ history: sessions }).install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-18' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-19' } });
    expect(rows()).toBe(10); // todavía no se buscó
    fireEvent.click(screen.getByText('Buscar'));
    expect(rows()).toBe(2);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-01-31' } });
    fireEvent.click(screen.getByText('Buscar'));
    expect(screen.getByText('No hay sesiones en esas fechas')).toBeTruthy();
  });

  it('exportar envía el filtro (exporta lo que se ve)', async () => {
    const mock = createElectronMock({ history: sessions });
    mock.install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByText('Buscar'));
    fireEvent.click(screen.getByText('Exportar PDF'));
    await waitFor(() => expect(mock.api.exportSessionHistoryPdf).toHaveBeenCalledWith({ from: '2026-10-15', to: null, limit: 10 }));
    vi.restoreAllMocks();
  });
});
