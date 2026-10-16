/**
 * Duración de la sesión: ORION #3 (vista compacta) y ORION #38 (tarjetas del diseño nuevo).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';
import { initialState } from '../store/appStore';
import TimerSelectPhase from './TimerSelectPhase';

function Probe() {
  const { state } = useApp();
  return <output data-testid="probe">{`${state.phase}|${state.sessionDuration}`}</output>;
}

function renderTimer() {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'timer-select' }}>
      <TimerSelectPhase />
      <Probe />
    </AppProvider>
  );
}

const card = (minutes: number) => screen.getByText(String(minutes)).closest('button')!;

describe('TimerSelectPhase (ORION #38)', () => {
  it('tres tarjetas sin emojis con su explicación adentro, minutos propios y el aviso de kiosko', () => {
    renderTimer();
    expect(screen.getByRole('heading', { name: '¿Cuánto tiempo vas a estudiar?' })).toBeTruthy();
    expect(card(25).textContent).toBe('25minPomodoroUn bloque corto');
    expect(card(50).textContent).toBe('50minEstándarFlujo profundo');
    expect(card(90).textContent).toBe('90minExtendidaUn ciclo ultradiano');
    expect(screen.getByLabelText('Minutos propios')).toBeTruthy();
    expect(screen.getByText('minutos (1 a 180)')).toBeTruthy();
    expect(screen.getByTestId('kiosk-note').textContent).toBe('Modo kiosko. No vas a poder salir de YALEH hasta que el tiempo llegue a cero.');
    expect(screen.getByTestId('kiosk-note').querySelector('svg')).toBeTruthy();
    // Sin emojis ni las cajitas de explicación de abajo.
    expect(document.body.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(screen.queryByText(/^Sesión:/)).toBeNull();
  });

  it('la elegida queda en naranja y el botón dice "Continuar con N min"', () => {
    renderTimer();
    fireEvent.click(card(50));
    expect(card(50).getAttribute('aria-pressed')).toBe('true');
    expect(card(50).className).toContain('border-accent');
    expect(card(25).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByText('Continuar con 50 min'));
    expect(screen.getByTestId('probe').textContent).toBe('confirm-session|3000');
  });

  it('los minutos propios (1 a 180) reemplazan la tarjeta elegida', () => {
    renderTimer();
    fireEvent.click(card(25));
    fireEvent.change(screen.getByLabelText('Minutos propios'), { target: { value: '40' } });
    expect(card(25).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Continuar con 40 min')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Minutos propios'), { target: { value: '500' } });
    expect((screen.getByText('Elegí una duración') as HTMLButtonElement).disabled).toBe(true);
  });
});
