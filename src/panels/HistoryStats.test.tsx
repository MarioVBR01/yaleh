/**
 * Historial y estadísticas (fase 10): datos reales de SQLite por IPC, no simulados.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionHistoryEntry } from '@shared/ipc-types';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import HistoryPanel from './HistoryPanel';
import StatsPanel from './StatsPanel';

const now = Date.now();
const history: SessionHistoryEntry[] = [
  {
    id: 'b', mode: 'offline', startedAt: now - 3_600_000, endsAt: now, durationSeconds: 90 * 60,
    status: 'interrupted', focusLost: 4, connectionLost: 0, interruptions: 1, endReason: null,
  },
  {
    id: 'a', mode: 'online', startedAt: now - 7_200_000, endsAt: now, durationSeconds: 25 * 60,
    status: 'finished', focusLost: 2, connectionLost: 1, interruptions: 0, endReason: 'completed',
  },
];

afterEach(() => uninstallElectronMock());

describe('HistoryPanel', () => {
  it('lista las sesiones guardadas con su estado y contadores', async () => {
    createElectronMock({ history }).install();
    render(<HistoryPanel />);
    expect(await screen.findByText('2 sesiones guardadas en este equipo')).toBeTruthy();
    expect(screen.getByText('Interrumpida')).toBeTruthy();
    expect(screen.getByText('Completada')).toBeTruthy();
    expect(screen.getByText('1 h 30 min')).toBeTruthy();
    expect(screen.getByText('Con conexión')).toBeTruthy();
  });

  it('Exportar PDF: lo pide al proceso principal y muestra dónde quedó (ORION #8)', async () => {
    const mock = createElectronMock({ history });
    mock.install();
    render(<HistoryPanel />);
    fireEvent.click(await screen.findByText('Exportar PDF'));
    expect(mock.api.exportSessionHistoryPdf).toHaveBeenCalled();
    expect(await screen.findByText(/Guardado en .*Historial de sesiones .*.pdf/)).toBeTruthy();
  });

  it('en el navegador avisa que el historial está en el escritorio', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('El historial se guarda en la aplicación de escritorio.')).toBeTruthy();
  });
});

describe('StatsPanel', () => {
  it('muestra minutos de las completadas y el promedio de pérdidas de foco', async () => {
    createElectronMock({ history }).install();
    render(<StatsPanel />);
    expect((await screen.findAllByText('25 min')).length).toBeGreaterThan(0);
    expect(screen.getByText('Pérdidas de foco por sesión').previousElementSibling?.textContent).toBe('3');
  });

  it('junto al gráfico redondo: completadas e interrumpidas con su % del total (ORION #6)', async () => {
    createElectronMock({ history }).install();
    render(<StatsPanel />);
    const done = await screen.findByTestId('outcome-success');
    expect(done.textContent).toContain('Completadas');
    expect(done.textContent).toContain('1');
    expect(done.textContent).toContain('50 % del total');
    expect(screen.getByTestId('outcome-danger').textContent).toContain('Interrumpidas');
  });

  it('debajo muestra solo las 10 últimas sesiones del historial (ORION #6)', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ ...history[1], id: 's' + i, startedAt: now - i * 3_600_000 }));
    createElectronMock({ history: many }).install();
    render(<StatsPanel />);
    expect(await screen.findByText('Sesiones recientes')).toBeTruthy();
    const table = screen.getByText('Sesiones recientes').parentElement!.querySelector('tbody')!;
    expect(table.querySelectorAll('tr')).toHaveLength(10);
  });

  it('sin sesiones lo dice', async () => {
    createElectronMock({ history: [] }).install();
    render(<StatsPanel />);
    expect(await screen.findByText('Todavía no hay sesiones terminadas.')).toBeTruthy();
  });
});
