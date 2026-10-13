/**
 * ORION #3: vista compacta de la duración de la sesión.
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

describe('TimerSelectPhase (vista compacta)', () => {
  it('muestra 25, 50 y 90 min y la entrada personalizada, sin el aviso de "Modo kiosko" ni los consejos', () => {
    renderTimer();
    expect(screen.getByText('25 min')).toBeTruthy();
    expect(screen.getByText('50 min')).toBeTruthy();
    expect(screen.getByText('90 min')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ej: 45')).toBeTruthy();
    expect(screen.getByText('Al confirmar, el entorno se bloqueará hasta que el tiempo expire.')).toBeTruthy();
    expect(screen.queryByText(/Modo Kiosko/i)).toBeNull();
    expect(screen.queryByText(/Pomodoro/)).toBeNull();
    expect(screen.queryByText(/ultradian/)).toBeNull();
  });

  it('elegir una opción muestra "Sesión: …" y "Continuar con …"', () => {
    renderTimer();
    fireEvent.click(screen.getByText('50 min'));
    expect(screen.getByText('Sesión: 50 minutos')).toBeTruthy();
    fireEvent.click(screen.getByText('Continuar con 50 minutos'));
    expect(screen.getByTestId('probe').textContent).toBe('confirm-session|3000');
  });

  it('los minutos personalizados reemplazan la opción rápida', () => {
    renderTimer();
    fireEvent.click(screen.getByText('25 min'));
    fireEvent.change(screen.getByPlaceholderText('Ej: 45'), { target: { value: '40' } });
    expect(screen.getByText('Sesión: 40 minutos')).toBeTruthy();
    expect(screen.getByText('Continuar con 40 minutos')).toBeTruthy();
  });
});
