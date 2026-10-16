/**
 * ORION #13 y #33: aviso "Te quedan N minutos de sesión" dentro de YALEH (franja naranja, extender desde el aviso).
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppAction } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import TimeWarningToast, { TIME_WARNING_SECONDS } from './TimeWarningToast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  uninstallElectronMock();
});

let dispatch: (action: AppAction) => void = () => {};
function Capture() {
  dispatch = useApp().dispatch;
  return null;
}

/** Cambia el tiempo restante como lo haría session:tick (y la duración al extender). */
const tick = (remainingSeconds: number, durationSeconds = 1800) =>
  act(() => dispatch({ type: 'RESUME_SESSION', payload: { durationSeconds, remainingSeconds, mode: 'offline' } }));

function renderToast(endWarningMinutes = 5, allowExtend = true) {
  const settings = { settings: { ...DEFAULT_SETTINGS, endWarningMinutes, allowExtend }, profileName: null, exportDirResolved: '', sessionActive: true };
  render(
    <AppProvider initial={{ ...initialState, phase: 'kiosk', workspaceId: 'ses1', sessionDuration: 1800, timeRemaining: 1800, settings }}>
      <Capture />
      <TimeWarningToast />
    </AppProvider>
  );
}

const toast = () => screen.queryByTestId('time-warning');

describe('Aviso de tiempo restante (ORION #13)', () => {
  it('aparece una sola vez al llegar a los minutos elegidos y se va solo', () => {
    renderToast(5);
    tick(301);
    expect(toast()).toBeNull();
    tick(300);
    expect(screen.getByRole('alert').textContent).toContain('Te quedan 5 minutos de sesión');
    act(() => vi.advanceTimersByTime(TIME_WARNING_SECONDS * 1000));
    expect(toast()).toBeNull();
    tick(250);
    tick(60);
    expect(toast()).toBeNull();
  });

  it('se puede cerrar con la X', () => {
    renderToast(5);
    tick(299);
    fireEvent.click(screen.getByTitle('Cerrar aviso'));
    expect(toast()).toBeNull();
  });

  it('vuelve a salir si la sesión se extiende', () => {
    renderToast(5);
    tick(300);
    fireEvent.click(screen.getByTitle('Cerrar aviso'));
    tick(1200, 2700); // extendida 15 min: la duración cambia
    expect(toast()).toBeNull();
    tick(300, 2700);
    expect(toast()).not.toBeNull();
  });

  it('usa los minutos de la configuración y se puede desactivar', () => {
    renderToast(15);
    tick(900);
    expect(screen.getByRole('alert').textContent).toContain('Te quedan 15 minutos');
  });

  it('sin la app de escritorio no ofrece extender (solo el aviso y la X)', () => {
    renderToast(5);
    tick(300);
    expect(screen.queryByText('+15 min')).toBeNull();
    expect(screen.getByTitle('Cerrar aviso')).toBeTruthy();
  });

  it('“+15 min” extiende desde el aviso, que se cierra (ORION #33)', async () => {
    const mock = createElectronMock({ snapshot: { status: 'active', durationSeconds: 1800, mode: 'offline', sessionId: 'ses1' } });
    mock.install();
    renderToast(5);
    tick(300);
    expect(screen.getByTestId('time-warning-countdown')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText('+15 min'));
    });
    expect(mock.api.extendSession).toHaveBeenCalledWith(900);
    expect(toast()).toBeNull();
  });

  it('“Otro tiempo” pide los minutos, respeta los límites y no se cierra mientras se escriben', async () => {
    const mock = createElectronMock({ snapshot: { status: 'active', durationSeconds: 1800, mode: 'offline', sessionId: 'ses1' } });
    mock.install();
    renderToast(5);
    tick(300);
    fireEvent.click(screen.getByText('Otro tiempo'));
    act(() => vi.advanceTimersByTime(TIME_WARNING_SECONDS * 1000 + 1000));
    const input = screen.getByLabelText('Minutos para extender');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Entre 1 y 180 minutos.')).toBeTruthy();
    expect(mock.api.extendSession).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '20' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(mock.api.extendSession).toHaveBeenCalledWith(1200);
    expect(toast()).toBeNull();
  });

  it('si la configuración no permite extender, el aviso no trae los botones', () => {
    createElectronMock().install();
    renderToast(5, false);
    tick(300);
    expect(screen.queryByText('+15 min')).toBeNull();
    expect(screen.queryByText('Otro tiempo')).toBeNull();
  });

  it('desactivado: no aparece', () => {
    renderToast(0);
    tick(60);
    expect(toast()).toBeNull();
  });
});
