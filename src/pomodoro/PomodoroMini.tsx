/**
 * @file PomodoroMini.tsx
 * @description Recuadro chico del Pomodoro en la barra inferior del kiosko (ORION #4).
 * Aparece cuando el Pomodoro ya se usó (corriendo o en pausa a mitad de un ciclo), así se ve
 * desde cualquier parte de la sesión. La barra inferior no la tapan las pestañas externas.
 * Clic en el tiempo: abre la vista Pomodoro. Botón: pausar o seguir.
 */

import { Pause, Play, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPomodoroTime, POMODORO_LABELS, usePomodoro } from './PomodoroContext';

export default function PomodoroMini() {
  const pomodoro = usePomodoro();
  const { state, dispatch, openTab } = useApp();
  if (!pomodoro.started) return null;

  const openView = () => {
    const existing = state.tabs.find(t => t.type === 'pomodoro');
    if (existing) dispatch({ type: 'SET_ACTIVE_TAB', payload: existing.id });
    else openTab({ type: 'pomodoro', title: 'Pomodoro', icon: '⏱️' });
  };

  const color = pomodoro.mode === 'work' ? 'text-danger' : pomodoro.mode === 'short-break' ? 'text-success' : 'text-accent';

  return (
    <div
      className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg border border-line bg-surface-raised/60 text-xs flex-shrink-0"
      aria-label="Pomodoro"
      data-testid="pomodoro-mini"
    >
      <button
        onClick={openView}
        className="flex items-center gap-1.5 font-mono font-bold text-ink-soft hover:text-ink"
        title={`Pomodoro · ${POMODORO_LABELS[pomodoro.mode]} (abrir)`}
      >
        <Timer size={12} className={color} />
        <span className={color}>{formatPomodoroTime(pomodoro.secondsLeft)}</span>
      </button>
      <button
        onClick={pomodoro.toggle}
        className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-raised"
        title={pomodoro.running ? 'Pausar Pomodoro' : 'Seguir con el Pomodoro'}
      >
        {pomodoro.running ? <Pause size={11} /> : <Play size={11} />}
      </button>
    </div>
  );
}
