/**
 * ORION #23 y #36: filtros del historial (atajos de fecha, rango propio, estado, modo y cantidad),
 * resumen de lo filtrado; exportar usa lo filtrado.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { filterSessions, localDateKey, parseHistoryFilter, presetRange, summarizeSessions } from '@shared/history-filter';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import HistoryPanel from './HistoryPanel';

/** "Hoy" de las pruebas: 20/10/2026 al mediodía. */
const NOW = new Date(2026, 9, 20, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  uninstallElectronMock();
});

/**
 * 25 sesiones, una por día desde el 20/10/2026 hacia atrás (más recientes primero).
 * Cada tercera está interrumpida y las pares son con conexión.
 */
const sessions: SessionHistoryEntry[] = Array.from({ length: 25 }, (_, i) => {
  const startedAt = new Date(2026, 9, 20 - i, 10, 0, 0).getTime();
  return {
    id: `s${i}`, mode: i % 2 === 0 ? 'online' : 'offline', startedAt, endsAt: startedAt + 600_000, durationSeconds: 600, studiedSeconds: 600,
    status: i % 3 === 0 ? 'interrupted' : 'finished', focusLost: 0, connectionLost: 0, interruptions: 0, endReason: i % 3 === 0 ? null : 'completed', files: [],
  };
});

const rows = () => document.querySelectorAll('tbody tr').length;

describe('filterSessions, presetRange, summarizeSessions y parseHistoryFilter', () => {
  it('filtra por rango inclusivo (hora local), estado y modo, y limita la cantidad', () => {
    const inRange = filterSessions(sessions, { from: '2026-10-10', to: '2026-10-12' });
    expect(inRange.map(s => localDateKey(s.startedAt))).toEqual(['2026-10-12', '2026-10-11', '2026-10-10']);
    expect(filterSessions(sessions, { limit: 10 })).toHaveLength(10);
    expect(filterSessions(sessions, { limit: null })).toHaveLength(25);
    expect(filterSessions(sessions, { status: 'interrupted' })).toHaveLength(9);
    expect(filterSessions(sessions, { status: 'completed' })).toHaveLength(16);
    expect(filterSessions(sessions, { status: 'active' })).toHaveLength(0);
    expect(filterSessions(sessions, { mode: 'online' })).toHaveLength(13);
  });

  it('atajos: hoy, 7 días (incluye hoy) y este mes', () => {
    expect(presetRange('today', NOW)).toEqual({ from: '2026-10-20', to: '2026-10-20' });
    expect(presetRange('7d', NOW)).toEqual({ from: '2026-10-14', to: '2026-10-20' });
    expect(presetRange('month', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-20' });
    expect(presetRange('all', NOW)).toEqual({ from: null, to: null });
  });

  it('resumen: sesiones, minutos estudiados y porcentaje de completadas', () => {
    expect(summarizeSessions(sessions.slice(0, 3))).toEqual({ sessions: 3, studiedMinutes: 30, completedPercent: 67 });
    expect(summarizeSessions([])).toEqual({ sessions: 0, studiedMinutes: 0, completedPercent: 0 });
  });

  it('valida el filtro que llega por IPC', () => {
    expect(parseHistoryFilter({ from: '2026-10-01', to: '', limit: 20 })).toEqual({ from: '2026-10-01', to: null, status: null, mode: null, limit: 20 });
    expect(parseHistoryFilter({ status: 'interrupted', mode: 'offline' })).toMatchObject({ status: 'interrupted', mode: 'offline' });
    expect(parseHistoryFilter(undefined)).toEqual({});
    expect(() => parseHistoryFilter({ from: '1/10/2026' })).toThrow();
    expect(() => parseHistoryFilter({ limit: 15 })).toThrow();
    expect(() => parseHistoryFilter({ status: 'borrada' })).toThrow();
    expect(() => parseHistoryFilter({ mode: 'kiosko' })).toThrow();
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

  it('los atajos filtran con un clic, sin "Buscar"', async () => {
    createElectronMock({ history: sessions }).install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    expect(screen.queryByText('Buscar')).toBeNull();
    fireEvent.click(screen.getByText('Hoy'));
    expect(rows()).toBe(1);
    expect(screen.getByText('Hoy').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText('7 días'));
    expect(rows()).toBe(7);
    fireEvent.change(screen.getByLabelText('Cantidad de sesiones'), { target: { value: 'all' } });
    fireEvent.click(screen.getByText('Este mes'));
    expect(rows()).toBe(20);
    fireEvent.click(screen.getByText('Todo'));
    expect(rows()).toBe(25);
  });

  it('"Elegir fechas" muestra el rango resaltado, filtra al elegir y la X lo quita', async () => {
    createElectronMock({ history: sessions }).install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    expect(screen.queryByTestId('custom-range')).toBeNull();
    fireEvent.click(screen.getByText('Elegir fechas'));
    expect(screen.getByTestId('custom-range').className).toContain('border-accent');
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-18' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-19' } });
    expect(rows()).toBe(2);

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-01-31' } });
    expect(screen.getByText('No hay sesiones con esos filtros')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Quitar fechas'));
    expect(screen.queryByTestId('custom-range')).toBeNull();
    expect(rows()).toBe(10);
  });

  it('estado y modo filtran apenas se eligen; el resumen sigue a lo filtrado', async () => {
    createElectronMock({ history: sessions }).install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    fireEvent.change(screen.getByLabelText('Cantidad de sesiones'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'interrupted' } });
    expect(rows()).toBe(9);
    expect(screen.getByTestId('history-summary').textContent).toBe('9 sesiones · 90 min estudiados · 0 % completadas');
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'online' } });
    expect(rows()).toBe(5);
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: '' } });
    expect(screen.getByTestId('history-summary').textContent).toBe('25 sesiones · 250 min estudiados · 64 % completadas');
  });

  it('exportar envía el filtro (exporta lo que se ve)', async () => {
    const mock = createElectronMock({ history: sessions });
    mock.install();
    render(<HistoryPanel />);
    await screen.findByText(/25 sesiones guardadas/);
    fireEvent.click(screen.getByText('7 días'));
    fireEvent.change(screen.getByLabelText('Modo'), { target: { value: 'offline' } });
    fireEvent.click(screen.getByText('Exportar PDF'));
    await waitFor(() => expect(screen.getByTestId('current-folder').textContent).toContain('YALEH'));
    fireEvent.click(screen.getByText('Guardar aquí'));
    await waitFor(() =>
      expect(mock.api.exportSessionHistoryPdf).toHaveBeenCalledWith(
        { from: '2026-10-14', to: '2026-10-20', status: null, mode: 'offline', limit: 10 },
        'C:\\Users\\x\\Documents\\YALEH'
      )
    );
  });
});
