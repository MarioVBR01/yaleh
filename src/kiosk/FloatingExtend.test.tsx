/**
 * ORION #44 (antes #10 y #32): extender en los últimos 5 minutos desde un recuadro flotante sobre la
 * barra lateral, sin salir del kiosko. Ya no hay botones de extender en la barra inferior.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { AppProvider, useApp } from '../context/AppContext';
import { PomodoroProvider } from '../pomodoro/PomodoroContext';
import { initialState, type AppState } from '../store/appStore';
import { createElectronMock, uninstallElectronMock } from '../test/electron-mock';
import BottomBar from './BottomBar';
import FloatingExtend from './FloatingExtend';

afterEach(() => uninstallElectronMock());

function Probe() {
  const { state } = useApp();
  return <output data-testid="probe">{`${state.phase}|${state.sessionDuration}|${state.timeRemaining}`}</output>;
}

function renderFloating(timeRemaining: number, { allowExtend = true, collapsed = false } = {}) {
  const settings = { settings: { ...DEFAULT_SETTINGS, allowExtend }, profileName: null, exportDirResolved: '', sessionActive: true };
  const initial: AppState = { ...initialState, phase: 'kiosk', kioskActive: true, sessionDuration: 1500, timeRemaining, settings };
  return render(
    <AppProvider initial={initial}>
      <PomodoroProvider>
        <FloatingExtend collapsed={collapsed} />
        <BottomBar onNewTab={() => {}} />
        <Probe />
      </PomodoroProvider>
    </AppProvider>
  );
}

const box = () => screen.queryByTestId('floating-extend');
const active = { snapshot: { status: 'active' as const, durationSeconds: 1500, mode: 'offline' as const, sessionId: 's1' } };

describe('Extender desde el recuadro flotante (ORION #44)', () => {
  it('no aparece antes de los últimos 5 minutos', () => {
    createElectronMock().install();
    renderFloating(301);
    expect(box()).toBeNull();
  });

  it('en los últimos 5 minutos aparece con +15, +25 y +50; ya no hay botones en la barra inferior', () => {
    createElectronMock(active).install();
    renderFloating(240);
    const floating = box()!;
    expect(floating.getAttribute('aria-label')).toBe('Extender la sesión');
    expect(within(floating).getByText('¿Necesitás más tiempo?')).toBeTruthy();
    expect(['+15', '+25', '+50'].every(t => within(floating).getByText(t))).toBe(true);
    // Flota (posición absoluta) y entra con animación, salvo con reducir animaciones.
    expect(floating.className).toContain('absolute');
    expect(floating.className).toContain('motion-safe:animate-[extend-in');
    expect(screen.queryByRole('group', { name: 'Extender' })).toBeNull();
    expect(screen.getAllByText('+15')).toHaveLength(1);
  });

  it('+15 suma los minutos y el kiosko sigue', async () => {
    const mock = createElectronMock(active);
    mock.install();
    renderFloating(240);
    await act(async () => {
      fireEvent.click(within(box()!).getByText('+15'));
    });
    expect(mock.api.extendSession).toHaveBeenCalledWith(900);
    // El mock devuelve el tiempo restante = la extensión; la app real suma al que quedaba.
    expect(screen.getByTestId('probe').textContent).toBe('kiosk|2400|900');
    expect(box()).toBeNull();
  });

  it('"Otro tiempo" acepta minutos propios con los límites de siempre', async () => {
    const mock = createElectronMock(active);
    mock.install();
    renderFloating(200);
    fireEvent.click(screen.getByText('Otro tiempo'));
    const input = screen.getByLabelText('Minutos para extender');
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(within(box()!).getByRole('alert').textContent).toBe('Entre 1 y 180 minutos.');
    expect(mock.api.extendSession).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '7' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(mock.api.extendSession).toHaveBeenCalledWith(420);
  });

  it('con la barra lateral colapsada es una columna con los tres botones', () => {
    createElectronMock(active).install();
    renderFloating(200, { collapsed: true });
    const floating = box()!;
    expect(floating.className).toContain('flex-col');
    expect(within(floating).getByTitle('Extender 25 minutos')).toBeTruthy();
    expect(within(floating).queryByText('Otro tiempo')).toBeNull();
  });

  it('se puede ocultar con la X', () => {
    createElectronMock(active).install();
    renderFloating(200);
    fireEvent.click(screen.getByLabelText('Ocultar'));
    expect(box()).toBeNull();
  });

  it('no aparece si la configuración no permite extender', () => {
    createElectronMock().install();
    renderFloating(120, { allowExtend: false });
    expect(box()).toBeNull();
  });
});
