/**
 * ORION #4: el Pomodoro se ve fuera de su vista (recuadro en la barra inferior)
 * y sus minutos los elige el estudiante.
 */

import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import PomodoroPanel from '../panels/PomodoroPanel';
import { initialState } from '../store/appStore';
import { nextPomodoroMode, PomodoroProvider, usePomodoro } from './PomodoroContext';
import PomodoroMini from './PomodoroMini';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse('2026-10-13T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

function Probe() {
  const p = usePomodoro();
  return <output data-testid="probe">{`${p.mode}|${p.secondsLeft}|${p.running}|${p.cycles}`}</output>;
}

function renderPomodoro(ui: React.ReactNode) {
  return render(
    <AppProvider initial={{ ...initialState, phase: 'kiosk' }}>
      <PomodoroProvider>
        {ui}
        <Probe />
      </PomodoroProvider>
    </AppProvider>
  );
}

const probe = () => screen.getByTestId('probe').textContent;

describe('Pomodoro global (ORION #4)', () => {
  it('el recuadro chico aparece al iniciar y sigue el mismo tiempo aunque la vista no esté', () => {
    renderPomodoro(
      <>
        <PomodoroPanel />
        <PomodoroMini />
      </>
    );
    expect(screen.queryByTestId('pomodoro-mini')).toBeNull();
    fireEvent.click(screen.getByTitle('Iniciar'));
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('pomodoro-mini').textContent).toContain('24:50');

  });

  it('el estado se conserva al desmontar y volver a montar la vista dentro del mismo proveedor', () => {
    function Toggle() {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button onClick={() => setShow(s => !s)}>alternar</button>
          {show && <PomodoroPanel />}
          <PomodoroMini />
        </>
      );
    }
    renderPomodoro(<Toggle />);
    fireEvent.click(screen.getByTitle('Iniciar'));
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(screen.getByText('alternar'));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByTestId('pomodoro-mini').textContent).toContain('23:00');
    fireEvent.click(screen.getByText('alternar'));
    expect(screen.getAllByText('23:00').length).toBeGreaterThan(0);
  });

  it('pausar y seguir desde el recuadro chico', () => {
    renderPomodoro(
      <>
        <PomodoroPanel />
        <PomodoroMini />
      </>
    );
    fireEvent.click(screen.getByTitle('Iniciar'));
    act(() => vi.advanceTimersByTime(5_000));
    fireEvent.click(screen.getByTitle('Pausar Pomodoro'));
    act(() => vi.advanceTimersByTime(30_000));
    expect(probe()).toBe('work|1495|false|0');
    fireEvent.click(screen.getByTitle('Seguir con el Pomodoro'));
    expect(probe()).toContain('|true|');
  });

  it('los minutos se personalizan y el reloj los toma', () => {
    renderPomodoro(<PomodoroPanel />);
    const input = screen.getByLabelText('Minutos de Trabajo');
    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.blur(input);
    expect(probe()).toBe('work|2400|false|0');
    expect(screen.getByText('40:00')).toBeTruthy();

    const shortBreak = screen.getByLabelText('Minutos de Descanso corto');
    fireEvent.change(shortBreak, { target: { value: '0' } });
    fireEvent.blur(shortBreak);
    expect(screen.getByText('1–60 min')).toBeTruthy();
  });

  it('al terminar el trabajo pasa al descanso con los minutos elegidos', () => {
    renderPomodoro(<PomodoroPanel />);
    const input = screen.getByLabelText('Minutos de Trabajo');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);
    const shortBreak = screen.getByLabelText('Minutos de Descanso corto');
    fireEvent.change(shortBreak, { target: { value: '3' } });
    fireEvent.keyDown(shortBreak, { key: 'Enter' });
    fireEvent.click(screen.getByTitle('Iniciar'));
    act(() => vi.advanceTimersByTime(61_000));
    expect(probe()).toBe('short-break|180|false|1');
  });

  it('cada 4 ciclos de trabajo toca el descanso largo', () => {
    expect(nextPomodoroMode('work', 1)).toBe('short-break');
    expect(nextPomodoroMode('work', 4)).toBe('long-break');
    expect(nextPomodoroMode('short-break', 1)).toBe('work');
  });
});

