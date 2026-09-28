import { describe, expect, it } from 'vitest';
import { appReducer, initialState, type AppState, type Tab } from './appStore';

const kioskState = (seconds: number): AppState => ({
  ...initialState,
  phase: 'kiosk',
  kioskActive: true,
  sessionDuration: seconds,
  timeRemaining: seconds,
});

describe('appReducer', () => {
  it('SET_SESSION_DURATION fija la duración y el tiempo restante', () => {
    const next = appReducer(initialState, { type: 'SET_SESSION_DURATION', payload: 1500 });
    expect(next.sessionDuration).toBe(1500);
    expect(next.timeRemaining).toBe(1500);
  });

  it('START_KIOSK activa el kiosko y cambia de fase', () => {
    const next = appReducer(initialState, { type: 'START_KIOSK' });
    expect(next.kioskActive).toBe(true);
    expect(next.phase).toBe('kiosk');
  });

  it('TICK_TIMER descuenta un segundo', () => {
    const next = appReducer(kioskState(10), { type: 'TICK_TIMER' });
    expect(next.timeRemaining).toBe(9);
    expect(next.kioskActive).toBe(true);
  });

  it('TICK_TIMER no baja de cero y desactiva el kiosko al llegar a cero', () => {
    const atOne = appReducer(kioskState(1), { type: 'TICK_TIMER' });
    expect(atOne.timeRemaining).toBe(0);
    expect(atOne.kioskActive).toBe(false);
    const again = appReducer(atOne, { type: 'TICK_TIMER' });
    expect(again.timeRemaining).toBe(0);
  });

  it('END_SESSION muestra el resumen de la sesión', () => {
    const next = appReducer(kioskState(0), { type: 'END_SESSION' });
    expect(next.phase).toBe('session-complete');
    expect(next.kioskActive).toBe(false);
    expect(next.timeRemaining).toBe(0);
  });

  it('ADD_TAB no duplica pestañas con la misma URL', () => {
    const tab: Tab = { id: 'a', type: 'workspace-url', title: 'Moodle', url: 'https://moodle.org' };
    const once = appReducer(initialState, { type: 'ADD_TAB', payload: tab });
    const twice = appReducer(once, { type: 'ADD_TAB', payload: { ...tab, id: 'b' } });
    expect(twice.tabs.filter(t => t.url === tab.url)).toHaveLength(1);
    expect(twice.activeTabId).toBe('a');
  });

  it('CLOSE_TAB no cierra la pestaña de inicio', () => {
    const next = appReducer(initialState, { type: 'CLOSE_TAB', payload: 'dashboard' });
    expect(next.tabs.map(t => t.id)).toContain('dashboard');
  });

  it('CLOSE_TAB activa otra pestaña al cerrar la activa', () => {
    const tab: Tab = { id: 'x', type: 'pomodoro', title: 'Pomodoro' };
    const opened = appReducer(initialState, { type: 'ADD_TAB', payload: tab });
    const closed = appReducer(opened, { type: 'CLOSE_TAB', payload: 'x' });
    expect(closed.activeTabId).toBe('dashboard');
  });

  it('ADD_ACTIVITY conserva como máximo 200 registros, el más reciente primero', () => {
    let state = initialState;
    for (let i = 0; i < 205; i++) {
      state = appReducer(state, {
        type: 'ADD_ACTIVITY',
        payload: { id: String(i), type: 'tool', label: `a${i}`, timestamp: new Date() },
      });
    }
    expect(state.activityHistory).toHaveLength(200);
    expect(state.activityHistory[0].id).toBe('204');
  });
});
