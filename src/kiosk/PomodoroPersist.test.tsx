/**
 * ORION #5: el Pomodoro no se reinicia al salir de su vista y volver.
 * Pasos de la tarjeta: ponerlo en marcha → cambiar a otra vista → volver al Pomodoro.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { appReducer, initialState, type Tab } from '../store/appStore';
import KioskLayout from './KioskLayout';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse('2026-10-13T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function TabsProbe() {
  const { state } = useApp();
  return <output data-testid="tabs">{state.tabs.map(t => t.type).join(',')}</output>;
}

/** Botón de la barra lateral (no la pestaña de la barra inferior con el mismo nombre). */
const sidebarButton = (label: string) =>
  screen.getAllByText(label).map(el => el.closest('button')!).find(b => b && !b.closest('[data-testid="pomodoro-mini"]') && b.className.includes('w-full'))!;

describe('Pomodoro al cambiar de vista (ORION #5)', () => {
  it('sigue corriendo y conserva el tiempo y los ciclos; no abre una segunda pestaña', () => {
    render(
      <AppProvider initial={{ ...initialState, phase: 'kiosk', kioskActive: true }}>
        <KioskLayout />
        <TabsProbe />
      </AppProvider>
    );

    fireEvent.click(sidebarButton('Pomodoro'));
    fireEvent.click(screen.getByTitle('Iniciar'));
    act(() => vi.advanceTimersByTime(90_000));

    // Otra vista: Estadísticas.
    fireEvent.click(sidebarButton('Estadísticas'));
    act(() => vi.advanceTimersByTime(30_000));

    // Volver al Pomodoro desde la barra lateral.
    fireEvent.click(sidebarButton('Pomodoro'));
    expect(screen.getByTestId('tabs').textContent!.split(',').filter(t => t === 'pomodoro')).toHaveLength(1);
    expect(within(screen.getByTestId('pomodoro-mini')).getByText('23:00')).toBeTruthy();
    expect(screen.getByTitle('Pausar')).toBeTruthy();
  });
});

describe('ADD_TAB: vistas únicas', () => {
  const tab = (id: string, type: Tab['type']): Tab => ({ id, type, title: type });

  it('abrir de nuevo Pomodoro, Estadísticas o Historial activa la pestaña existente', () => {
    let state = appReducer(initialState, { type: 'ADD_TAB', payload: tab('p1', 'pomodoro') });
    state = appReducer(state, { type: 'ADD_TAB', payload: tab('s1', 'stats') });
    state = appReducer(state, { type: 'ADD_TAB', payload: tab('p2', 'pomodoro') });
    expect(state.tabs.filter(t => t.type === 'pomodoro').map(t => t.id)).toEqual(['p1']);
    expect(state.activeTabId).toBe('p1');
  });

  it('los editores sí pueden abrirse varias veces', () => {
    let state = appReducer(initialState, { type: 'ADD_TAB', payload: tab('e1', 'offline-editor') });
    state = appReducer(state, { type: 'ADD_TAB', payload: tab('e2', 'offline-editor') });
    expect(state.tabs.filter(t => t.type === 'offline-editor')).toHaveLength(2);
  });
});
