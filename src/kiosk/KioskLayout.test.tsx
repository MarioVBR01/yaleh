/**
 * Pruebas del kiosko en la interfaz.
 * - Escritorio: el tiempo lo envía el proceso principal; la interfaz no cuenta por su cuenta.
 * - Navegador: temporizador local de vista previa (regresión del intervalo duplicado del MVP).
 * - Modo offline / conexión perdida: solo módulos locales.
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionMode, SessionMode } from '@shared/ipc-types';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import KioskLayout from './KioskLayout';

function PhaseProbe() {
  const { state } = useApp();
  return <output data-testid="phase">{state.phase}</output>;
}

function renderKiosk(
  seconds: number,
  options: { sessionMode?: SessionMode | null; connection?: ConnectionMode } = {}
) {
  const initial: AppState = {
    ...initialState,
    phase: 'kiosk',
    kioskActive: true,
    sessionDuration: seconds,
    timeRemaining: seconds,
    sessionMode: options.sessionMode ?? null,
    connection: options.connection ?? 'online',
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

  it('la web muestra las herramientas online (sin cambios en esta fase)', () => {
    renderKiosk(60);
    expect(screen.getByText('Herramientas')).toBeTruthy();
  });
});

describe('Temporizador del kiosko en el escritorio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallElectronMock();
  });

  it('no cuenta por su cuenta: solo muestra el tiempo que envía el proceso principal', async () => {
    const mock = createElectronMock();
    mock.install();
    renderKiosk(10, { sessionMode: 'offline', connection: 'offline' });

    await advanceSeconds(3);
    expect(screen.getByText('00:00:10')).toBeTruthy();

    mock.emitTick(4);
    expect(screen.getByText('00:00:04')).toBeTruthy();
  });

  it('muestra el resumen cuando el proceso principal avisa el fin, sin cerrar la app', () => {
    const mock = createElectronMock();
    mock.install();
    renderKiosk(10, { sessionMode: 'offline', connection: 'offline' });

    mock.emitTick(0);
    // Con tiempo cero pero sin aviso de fin, sigue en el kiosko: manda el proceso principal.
    expect(screen.getByTestId('phase').textContent).toBe('kiosk');

    mock.emitEnded();
    expect(screen.getByTestId('phase').textContent).toBe('session-complete');
    expect(mock.api.closeApp).not.toHaveBeenCalled();
  });
});

describe('Kiosko según el modo (escritorio)', () => {
  afterEach(() => {
    uninstallElectronMock();
  });

  it('sesión offline: oculta las herramientas online y Google Workspace', () => {
    createElectronMock().install();
    renderKiosk(60, { sessionMode: 'offline', connection: 'online' });

    expect(screen.queryByText('Herramientas')).toBeNull();
    expect(screen.queryByText('Google Workspace')).toBeNull();
    // Los módulos locales siguen disponibles.
    expect(screen.getByText('Ofimática Offline')).toBeTruthy();
    expect(screen.getByText('Pomodoro')).toBeTruthy();
  });

  it('sesión online con conexión: muestra las herramientas y no muestra el aviso', () => {
    createElectronMock({ connection: 'online' }).install();
    renderKiosk(60, { sessionMode: 'online', connection: 'online' });

    expect(screen.getByText('Herramientas')).toBeTruthy();
    expect(screen.getByText('Google Workspace')).toBeTruthy();
    expect(screen.queryByText(/Sin conexión: puedes seguir/)).toBeNull();
  });

  it('si se corta la conexión en una sesión online: oculta las herramientas y avisa', () => {
    createElectronMock({ connection: 'online' }).install();
    renderKiosk(60, { sessionMode: 'online', connection: 'offline' });

    expect(screen.getByText('Sin conexión: puedes seguir con los módulos locales')).toBeTruthy();
    expect(screen.queryByText('Herramientas')).toBeNull();
    expect(screen.queryByText('Google Workspace')).toBeNull();
    expect(screen.getByTestId('phase').textContent).toBe('kiosk');
  });
});
