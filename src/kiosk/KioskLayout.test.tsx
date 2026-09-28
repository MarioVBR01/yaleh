/**
 * Pruebas del temporizador del kiosko en la interfaz.
 * - Escritorio: el tiempo lo envía el proceso principal; la interfaz no cuenta por su cuenta.
 * - Navegador: temporizador local de vista previa (regresión del intervalo duplicado del MVP).
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ElectronAPI,
  SessionEndedPayload,
  SessionTickPayload,
} from '@shared/ipc-types';
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

/** API de escritorio simulada que permite emitir eventos del proceso principal. */
function createElectronMock() {
  let tick: ((p: SessionTickPayload) => void) | null = null;
  let ended: ((p: SessionEndedPayload) => void) | null = null;
  const snapshot = { status: 'active' as const, sessionId: 's1', durationSeconds: 10, remainingSeconds: 10 };
  const api: ElectronAPI = {
    version: 'test',
    startSession: vi.fn(async () => snapshot),
    getSessionState: vi.fn(async () => snapshot),
    resumeSession: vi.fn(async () => snapshot),
    discardResume: vi.fn(async () => snapshot),
    onSessionTick: vi.fn(cb => {
      tick = cb;
      return () => {
        tick = null;
      };
    }),
    onSessionEnded: vi.fn(cb => {
      ended = cb;
      return () => {
        ended = null;
      };
    }),
    closeApp: vi.fn(async () => {}),
    openExternal: vi.fn(async () => true),
    onAuthToken: vi.fn(() => () => {}),
    onSessionLink: vi.fn(() => () => {}),
  };
  return {
    api,
    emitTick: (remainingSeconds: number) => act(() => tick?.({ remainingSeconds })),
    emitEnded: () => act(() => ended?.({ reason: 'completed' })),
  };
}

describe('Temporizador del kiosko en el navegador (vista previa)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('descuenta exactamente un segundo por segundo', async () => {
    renderKiosk(10);
    expect(screen.getByText('00:00:10')).toBeTruthy();

    await advanceSeconds(3);

    expect(screen.getByText('00:00:07')).toBeTruthy();
  });

  it('al llegar a cero muestra el resumen', async () => {
    renderKiosk(3);

    await advanceSeconds(4);

    expect(screen.getByTestId('phase').textContent).toBe('session-complete');
  });
});

describe('Temporizador del kiosko en el escritorio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.electronAPI;
  });

  it('no cuenta por su cuenta: solo muestra el tiempo que envía el proceso principal', async () => {
    const mock = createElectronMock();
    window.electronAPI = mock.api;
    renderKiosk(10);

    await advanceSeconds(3);
    expect(screen.getByText('00:00:10')).toBeTruthy();

    mock.emitTick(4);
    expect(screen.getByText('00:00:04')).toBeTruthy();
  });

  it('muestra el resumen cuando el proceso principal avisa el fin, sin cerrar la app', async () => {
    const mock = createElectronMock();
    window.electronAPI = mock.api;
    renderKiosk(10);

    mock.emitTick(0);
    // Con tiempo cero pero sin aviso de fin, sigue en el kiosko: manda el proceso principal.
    expect(screen.getByTestId('phase').textContent).toBe('kiosk');

    mock.emitEnded();
    expect(screen.getByTestId('phase').textContent).toBe('session-complete');
    expect(mock.api.closeApp).not.toHaveBeenCalled();
  });
});
