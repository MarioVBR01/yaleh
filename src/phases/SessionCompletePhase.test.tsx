/**
 * ORION #2: extender la sesión desde la pantalla de sesión completada.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import SessionCompletePhase from './SessionCompletePhase';

afterEach(() => uninstallElectronMock());

function Probe() {
  const { state } = useApp();
  return <output data-testid="probe">{`${state.phase}|${state.sessionDuration}|${state.timeRemaining}`}</output>;
}

function renderComplete() {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'session-complete', sessionDuration: 1500 }}>
      <SessionCompletePhase />
      <Probe />
    </AppProvider>
  );
}

describe('SessionCompletePhase: extender la sesión', () => {
  it('en el escritorio ofrece +15, +25 y +50 min y vuelve al kiosko con el tiempo sumado', async () => {
    const mock = createElectronMock({ snapshot: { status: 'finished', durationSeconds: 1500, mode: 'offline', sessionId: 's1' } });
    mock.install();
    renderComplete();
    expect(screen.getByText('+15 min')).toBeTruthy();
    expect(screen.getByText('+50 min')).toBeTruthy();
    fireEvent.click(screen.getByText('+25 min'));
    expect(mock.api.extendSession).toHaveBeenCalledWith(1500);
    expect((await screen.findByText('kiosk|3000|1500')).textContent).toBe('kiosk|3000|1500');
  });

  it('si el proceso principal lo rechaza, muestra el motivo y se queda en la pantalla', async () => {
    const mock = createElectronMock();
    mock.api.extendSession = async () => {
      throw new Error('Solo se puede extender una sesión que acaba de terminar.');
    };
    mock.install();
    renderComplete();
    fireEvent.click(screen.getByText('+15 min'));
    expect(await screen.findByText(/No se pudo extender la sesión/)).toBeTruthy();
    expect(screen.getByTestId('probe').textContent).toBe('session-complete|1500|0');
  });

  it('también acepta minutos propios (ORION #10)', async () => {
    const mock = createElectronMock({ snapshot: { status: 'finished', durationSeconds: 1500, mode: 'offline', sessionId: 's1' } });
    mock.install();
    renderComplete();
    fireEvent.change(screen.getByLabelText('Minutos para extender'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Extender'));
    expect(mock.api.extendSession).toHaveBeenCalledWith(420);
    expect((await screen.findByText('kiosk|1920|420')).textContent).toBe('kiosk|1920|420');
  });

  it('minutos propios fuera de rango: no extiende', () => {
    const mock = createElectronMock();
    mock.install();
    renderComplete();
    fireEvent.change(screen.getByLabelText('Minutos para extender'), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Extender'));
    expect(screen.getByText('Entre 1 y 180 minutos.')).toBeTruthy();
    expect(mock.api.extendSession).not.toHaveBeenCalled();
  });

  it('en el navegador no ofrece extender', () => {
    renderComplete();
    expect(screen.queryByText('+15 min')).toBeNull();
  });
});
