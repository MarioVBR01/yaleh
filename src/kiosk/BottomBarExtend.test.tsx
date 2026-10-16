/**
 * ORION #10 y #32: extender desde la barra inferior durante los últimos 5 minutos, a un clic, sin salir del kiosko.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { AppProvider, useApp } from '../context/AppContext';
import { PomodoroProvider } from '../pomodoro/PomodoroContext';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import BottomBar from './BottomBar';

afterEach(() => uninstallElectronMock());

function Probe() {
  const { state } = useApp();
  return <output data-testid="probe">{`${state.phase}|${state.sessionDuration}|${state.timeRemaining}`}</output>;
}

function renderBar(timeRemaining: number, allowExtend = true) {
  const settings = { settings: { ...DEFAULT_SETTINGS, allowExtend }, profileName: null, exportDirResolved: '', sessionActive: true };
  const initial: AppState = { ...initialState, phase: 'kiosk', kioskActive: true, sessionDuration: 1500, timeRemaining, settings };
  return render(
    <AppProvider initial={initial}>
      <PomodoroProvider>
        <BottomBar onNewTab={() => {}} />
        <Probe />
      </PomodoroProvider>
    </AppProvider>
  );
}

const group = () => screen.queryByRole('group', { name: 'Extender' });

describe('Extender tiempo en la barra inferior (ORION #10 y #32)', () => {
  it('no aparece antes de los últimos 5 minutos', () => {
    createElectronMock().install();
    renderBar(301);
    expect(group()).toBeNull();
    expect(screen.getByTestId('session-clock').dataset.low).toBe('false');
  });

  it('en los últimos 5 minutos suma los minutos y el kiosko sigue', async () => {
    const mock = createElectronMock({ snapshot: { status: 'active', durationSeconds: 1500, mode: 'offline', sessionId: 's1' } });
    mock.install();
    renderBar(240);
    // El reloj se pone naranja y el grupo muestra los minutos sin abrir otro menú.
    expect(screen.getByTestId('session-clock').dataset.low).toBe('true');
    expect(screen.getByText('Quedan')).toBeTruthy();
    fireEvent.click(within(group()!).getByText('+15'));
    expect(mock.api.extendSession).toHaveBeenCalledWith(900);
    // El mock devuelve el tiempo restante = la extensión; la app real suma al que quedaba.
    expect((await screen.findByText('kiosk|2400|900')).textContent).toBe('kiosk|2400|900');
  });

  it('no aparece si la configuración no permite extender', () => {
    createElectronMock().install();
    renderBar(120, false);
    expect(group()).toBeNull();
  });

  it('“…” permite escribir otros minutos con los límites de siempre', async () => {
    const mock = createElectronMock({ snapshot: { status: 'active', durationSeconds: 1500, mode: 'offline', sessionId: 's1' } });
    mock.install();
    renderBar(200);
    fireEvent.click(screen.getByLabelText('Otros minutos'));
    const input = screen.getByLabelText('Minutos para extender');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(within(group()!).getByRole('alert').textContent).toBe('1–180 min');
    expect(mock.api.extendSession).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mock.api.extendSession).toHaveBeenCalledWith(420);
    expect((await screen.findByText('kiosk|1920|420')).textContent).toBe('kiosk|1920|420');
  });
});
