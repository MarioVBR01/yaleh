/**
 * ORION #10: extender desde la barra inferior durante los últimos 5 minutos, sin salir del kiosko.
 */

import { fireEvent, render, screen } from '@testing-library/react';
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

describe('Extender tiempo en la barra inferior (ORION #10)', () => {
  it('no aparece antes de los últimos 5 minutos', () => {
    createElectronMock().install();
    renderBar(301);
    expect(screen.queryByText('Extender tiempo')).toBeNull();
  });

  it('en los últimos 5 minutos suma los minutos y el kiosko sigue', async () => {
    const mock = createElectronMock({ snapshot: { status: 'active', durationSeconds: 1500, mode: 'offline', sessionId: 's1' } });
    mock.install();
    renderBar(240);
    fireEvent.click(screen.getByText('Extender tiempo'));
    fireEvent.click(screen.getByText('+15 min'));
    expect(mock.api.extendSession).toHaveBeenCalledWith(900);
    // El mock devuelve el tiempo restante = la extensión; la app real suma al que quedaba.
    expect((await screen.findByText('kiosk|2400|900')).textContent).toBe('kiosk|2400|900');
    expect(screen.queryByLabelText('Extender tiempo')).toBeNull();
  });

  it('no aparece si la configuración no permite extender', () => {
    createElectronMock().install();
    renderBar(120, false);
    expect(screen.queryByText('Extender tiempo')).toBeNull();
  });
});
