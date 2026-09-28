/**
 * Pruebas de regresión del temporizador del kiosko.
 * El MVP tenía dos intervalos (KioskLayout y BottomBar) que descontaban a la
 * vez, y BottomBar cerraba la aplicación antes de mostrar el resumen.
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import KioskLayout from './KioskLayout';

function PhaseProbe() {
  const { state } = useApp();
  return <output data-testid="phase">{state.phase}</output>;
}

function renderKiosk(seconds: number) {
  const initial: AppState = {
    ...initialState,
    phase: 'kiosk',
    kioskActive: true,
    sessionDuration: seconds,
    timeRemaining: seconds,
  };
  return render(
    <AppProvider initial={initial}>
      <PhaseProbe />
      <KioskLayout />
    </AppProvider>
  );
}

/** Avanza el reloj simulado segundo a segundo, dejando correr los efectos. */
async function advanceSeconds(n: number) {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('Temporizador del kiosko', () => {
  const electronAPI = {
    activateKiosk: vi.fn(async () => {}),
    deactivateKiosk: vi.fn(async () => {}),
    closeApp: vi.fn(async () => {}),
    openExternal: vi.fn(async () => true),
    onAuthToken: vi.fn(() => () => {}),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    window.electronAPI = electronAPI;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete window.electronAPI;
  });

  it('descuenta exactamente un segundo por segundo', async () => {
    renderKiosk(10);
    expect(screen.getByText('00:00:10')).toBeTruthy();

    await advanceSeconds(3);

    expect(screen.getByText('00:00:07')).toBeTruthy();
  });

  it('al terminar muestra el resumen y no cierra la aplicación', async () => {
    renderKiosk(3);

    await advanceSeconds(4);

    expect(screen.getByTestId('phase').textContent).toBe('session-complete');
    expect(electronAPI.deactivateKiosk).toHaveBeenCalled();
    expect(electronAPI.closeApp).not.toHaveBeenCalled();
  });
});
