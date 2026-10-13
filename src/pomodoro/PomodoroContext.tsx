/**
 * @file PomodoroContext.tsx
 * @description Estado del Pomodoro para todo el kiosko (ORION #4). Antes vivía dentro de su
 * vista; ahora el recuadro de la barra inferior y la vista Pomodoro muestran el mismo
 * temporizador. El tiempo se calcula con el reloj (momento de fin), no contando ticks.
 * Los minutos de cada modo los elige el estudiante.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type PomodoroMode = 'work' | 'short-break' | 'long-break';

export const POMODORO_LABELS: Record<PomodoroMode, string> = {
  work: 'Trabajo',
  'short-break': 'Descanso corto',
  'long-break': 'Descanso largo',
};

export const DEFAULT_POMODORO_MINUTES: Record<PomodoroMode, number> = { work: 25, 'short-break': 5, 'long-break': 15 };

/** Límites de los minutos personalizados. */
export const POMODORO_LIMITS: Record<PomodoroMode, { min: number; max: number }> = {
  work: { min: 1, max: 120 },
  'short-break': { min: 1, max: 60 },
  'long-break': { min: 1, max: 60 },
};

/** Cada cuántos ciclos de trabajo toca el descanso largo. */
const CYCLES_PER_ROUND = 4;

export interface PomodoroState {
  mode: PomodoroMode;
  minutes: Record<PomodoroMode, number>;
  secondsLeft: number;
  running: boolean;
  soundEnabled: boolean;
  cycles: number;
  workSeconds: number;
}

export interface PomodoroApi extends PomodoroState {
  totalSeconds: number;
  /** El temporizador ya se usó (está corriendo o en pausa a mitad de un ciclo). */
  started: boolean;
  /** Modo que sigue al terminar el actual. */
  nextMode: PomodoroMode;
  toggle: () => void;
  reset: () => void;
  setMode: (mode: PomodoroMode) => void;
  /** Cambia los minutos de un modo. Devuelve false si el valor no es válido. */
  setMinutes: (mode: PomodoroMode, minutes: number) => boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const PomodoroContext = createContext<PomodoroApi | null>(null);

function playBeep(frequency = 880, duration = 400, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Sin Web Audio: sin sonido.
  }
}

function playAlert(finished: PomodoroMode) {
  if (finished === 'work') {
    playBeep(523, 200);
    setTimeout(() => playBeep(659, 200), 250);
    setTimeout(() => playBeep(784, 400), 500);
  } else {
    playBeep(440, 300, 'triangle');
    setTimeout(() => playBeep(550, 400, 'triangle'), 350);
  }
}

/** Modo siguiente: tras el trabajo, descanso (largo cada 4 ciclos); tras un descanso, trabajo. */
export function nextPomodoroMode(mode: PomodoroMode, cyclesAfter: number): PomodoroMode {
  if (mode !== 'work') return 'work';
  return cyclesAfter % CYCLES_PER_ROUND === 0 ? 'long-break' : 'short-break';
}

export function isValidPomodoroMinutes(mode: PomodoroMode, minutes: number): boolean {
  const { min, max } = POMODORO_LIMITS[mode];
  return Number.isInteger(minutes) && minutes >= min && minutes <= max;
}

export function PomodoroProvider({ children, now = () => Date.now() }: { children: ReactNode; now?: () => number }) {
  const [state, setState] = useState<PomodoroState>({
    mode: 'work',
    minutes: DEFAULT_POMODORO_MINUTES,
    secondsLeft: DEFAULT_POMODORO_MINUTES.work * 60,
    running: false,
    soundEnabled: true,
    cycles: 0,
    workSeconds: 0,
  });
  /** Momento (ms) en que termina el ciclo en curso; null en pausa. */
  const endsAt = useRef<number | null>(null);
  const nowRef = useRef(now);
  nowRef.current = now;

  const tick = useCallback(() => {
    setState(prev => {
      if (!prev.running || endsAt.current === null) return prev;
      const left = Math.max(0, Math.ceil((endsAt.current - nowRef.current()) / 1000));
      const elapsed = prev.secondsLeft - left;
      const workSeconds = prev.mode === 'work' ? prev.workSeconds + Math.max(0, elapsed) : prev.workSeconds;
      if (left > 0) return left === prev.secondsLeft ? prev : { ...prev, secondsLeft: left, workSeconds };

      // Fin del ciclo: alerta y se prepara el siguiente modo (en pausa).
      endsAt.current = null;
      if (prev.soundEnabled) playAlert(prev.mode);
      const cycles = prev.mode === 'work' ? prev.cycles + 1 : prev.cycles;
      const mode = nextPomodoroMode(prev.mode, cycles);
      return { ...prev, running: false, mode, cycles, workSeconds, secondsLeft: prev.minutes[mode] * 60 };
    });
  }, []);

  useEffect(() => {
    if (!state.running) return;
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [state.running, tick]);

  const toggle = useCallback(() => {
    setState(prev => {
      if (prev.running) {
        endsAt.current = null;
        return { ...prev, running: false };
      }
      endsAt.current = nowRef.current() + prev.secondsLeft * 1000;
      return { ...prev, running: true };
    });
  }, []);

  const reset = useCallback(() => {
    endsAt.current = null;
    setState(prev => ({ ...prev, running: false, secondsLeft: prev.minutes[prev.mode] * 60 }));
  }, []);

  const setMode = useCallback((mode: PomodoroMode) => {
    endsAt.current = null;
    setState(prev => ({ ...prev, mode, running: false, secondsLeft: prev.minutes[mode] * 60 }));
  }, []);

  const setMinutes = useCallback((mode: PomodoroMode, minutes: number) => {
    if (!isValidPomodoroMinutes(mode, minutes)) return false;
    setState(prev => {
      const next = { ...prev, minutes: { ...prev.minutes, [mode]: minutes } };
      // Si el modo es el actual y no está corriendo, el reloj muestra el tiempo nuevo.
      // Si está corriendo, el cambio vale desde el próximo ciclo.
      if (mode === prev.mode && !prev.running) next.secondsLeft = minutes * 60;
      return next;
    });
    return true;
  }, []);

  const setSoundEnabled = useCallback((soundEnabled: boolean) => setState(prev => ({ ...prev, soundEnabled })), []);

  const api = useMemo<PomodoroApi>(() => {
    const totalSeconds = state.minutes[state.mode] * 60;
    return {
      ...state,
      totalSeconds,
      started: state.running || state.secondsLeft < totalSeconds,
      nextMode: nextPomodoroMode(state.mode, state.mode === 'work' ? state.cycles + 1 : state.cycles),
      toggle,
      reset,
      setMode,
      setMinutes,
      setSoundEnabled,
    };
  }, [state, toggle, reset, setMode, setMinutes, setSoundEnabled]);

  return <PomodoroContext.Provider value={api}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroApi {
  const api = useContext(PomodoroContext);
  if (!api) throw new Error('usePomodoro debe usarse dentro de PomodoroProvider.');
  return api;
}

/** MM:SS */
export function formatPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Como usePomodoro, pero null fuera del kiosko (por ejemplo, la Configuración desde la bienvenida). */
export function usePomodoroOptional(): PomodoroApi | null {
  return useContext(PomodoroContext);
}
