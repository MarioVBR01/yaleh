/**
 * ORION #40: batería en portátiles (barra inferior y aviso de batería baja).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { initialState } from '../store/appStore';
import { BatteryIndicator, BatteryWarningToast, batteryLevel } from './battery';

/** BatteryManager simulado: cambia los valores y emite los eventos de Chromium. */
class FakeBattery extends EventTarget {
  constructor(
    public level: number,
    public charging: boolean,
    public chargingTime = charging ? 0 : Infinity,
    public dischargingTime = charging ? Infinity : 3600
  ) {
    super();
  }
  set(level: number, charging = this.charging) {
    const chargingChanged = charging !== this.charging;
    this.level = level;
    this.charging = charging;
    this.chargingTime = charging ? 1800 : Infinity;
    this.dischargingTime = charging ? Infinity : 3600;
    act(() => {
      this.dispatchEvent(new Event('levelchange'));
      if (chargingChanged) this.dispatchEvent(new Event('chargingchange'));
    });
  }
}

function installBattery(battery: FakeBattery | null) {
  Object.defineProperty(navigator, 'getBattery', {
    configurable: true,
    value: battery ? () => Promise.resolve(battery) : undefined,
  });
}

afterEach(() => {
  delete (navigator as { getBattery?: unknown }).getBattery;
});

function renderKiosk() {
  render(
    <AppProvider initial={{ ...initialState, phase: 'kiosk' }}>
      <BatteryWarningToast />
      <BatteryIndicator />
    </AppProvider>
  );
}

describe('Batería (ORION #40)', () => {
  it('niveles: normal, baja (≤ 20 %) y crítica (≤ 10 %); cargando siempre es normal', () => {
    expect(batteryLevel({ percent: 21, charging: false })).toBe('normal');
    expect(batteryLevel({ percent: 20, charging: false })).toBe('low');
    expect(batteryLevel({ percent: 10, charging: false })).toBe('critical');
    expect(batteryLevel({ percent: 5, charging: true })).toBe('normal');
  });

  it('en una portátil muestra el porcentaje y el estado de carga', async () => {
    installBattery(new FakeBattery(0.64, false));
    renderKiosk();
    const indicator = await screen.findByTestId('battery');
    expect(indicator.textContent).toBe('64 %');
    expect(indicator.getAttribute('title')).toBe('Batería');
  });

  it('en un equipo de escritorio (sin batería) no muestra nada', async () => {
    const desktop = new FakeBattery(1, true, 0, Infinity);
    installBattery(desktop);
    renderKiosk();
    await act(async () => {});
    expect(screen.queryByTestId('battery')).toBeNull();
  });

  it('avisa al 20 % y otra vez al 10 %; se cierra solo al conectar el cargador', async () => {
    const battery = new FakeBattery(0.3, false);
    installBattery(battery);
    renderKiosk();
    await screen.findByTestId('battery');
    expect(screen.queryByTestId('battery-warning')).toBeNull();

    battery.set(0.2);
    expect(screen.getByRole('alert').textContent).toBe('Batería baja (20 %). Conectá el cargador para no perder la sesión.');
    expect(screen.getByTestId('battery').dataset.level).toBe('low');

    // Sale una sola vez por umbral.
    fireEvent.click(screen.getByTitle('Cerrar aviso'));
    battery.set(0.15);
    expect(screen.queryByTestId('battery-warning')).toBeNull();

    battery.set(0.1);
    expect(screen.getByRole('alert').textContent).toContain('Batería baja (10 %)');
    expect(screen.getByTestId('battery').dataset.level).toBe('critical');

    battery.set(0.1, true);
    await waitFor(() => expect(screen.queryByTestId('battery-warning')).toBeNull());
    expect(screen.getByTestId('battery').getAttribute('title')).toBe('Cargando');
    expect(screen.getByTestId('battery').dataset.level).toBe('normal');
  });
});
