/**
 * @file FloatingExtend.tsx
 * @description Recuadro flotante para extender la sesión (ORION #44, reemplaza la ubicación de #32):
 * en los últimos 5 minutos aparece abajo a la izquierda, encima de la barra lateral, como los avisos
 * emergentes de los navegadores. Va dentro del contenedor de la barra lateral porque las pestañas de
 * Google (WebContentsView) se dibujan encima del HTML del área de trabajo y lo taparían; la barra
 * lateral nunca queda debajo de una pestaña.
 * - +15, +25 y +50 a un clic; con la barra expandida, también "Otro tiempo" (1 a 180 minutos).
 * - Con la barra colapsada, una columna angosta con los tres botones.
 * - Se puede ocultar con la X; vuelve a salir si la sesión se extiende.
 * - Entra deslizándose (sin animación con "Reducir animaciones" o si el sistema lo pide).
 * Extender lo decide el proceso principal: suma el tiempo sin liberar el kiosko.
 */

import { useState } from 'react';
import { TimerReset, X } from 'lucide-react';
import { EXTEND_ACTIVE_WINDOW_SECONDS, EXTEND_SESSION_MINUTES, LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';
import { useExtendSession } from './useExtendSession';

export default function FloatingExtend({ collapsed }: { collapsed: boolean }) {
  const { state } = useApp();
  const { allowed, extend } = useExtendSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  /** Duración de la sesión para la que se ocultó (si se extiende, cambia y vuelve a salir). */
  const [hiddenFor, setHiddenFor] = useState<number | null>(null);

  const visible =
    allowed &&
    state.sessionDuration > 0 &&
    state.timeRemaining > 0 &&
    state.timeRemaining <= EXTEND_ACTIVE_WINDOW_SECONDS &&
    hiddenFor !== state.sessionDuration;
  if (!visible) return null;

  const run = async (minutes: number) => {
    setBusy(true);
    setError(null);
    try {
      await extend(minutes);
      setCustomOpen(false);
      setCustom('');
    } catch (err) {
      console.error('No se pudo extender la sesión:', err);
      setError('No se pudo extender.');
    } finally {
      setBusy(false);
    }
  };

  const runCustom = () => {
    const minutes = Number(custom.trim());
    if (!Number.isInteger(minutes) || minutes < LIMITS.minSessionMinutes || minutes > LIMITS.maxSessionMinutes) {
      setError(`Entre ${LIMITS.minSessionMinutes} y ${LIMITS.maxSessionMinutes} minutos.`);
      return;
    }
    void run(minutes);
  };

  const minutesLeft = Math.max(1, Math.ceil(state.timeRemaining / 60));
  const chip = 'rounded-lg bg-black/85 text-accent font-bold hover:bg-black disabled:opacity-60';

  return (
    <div
      role="dialog"
      aria-label="Extender la sesión"
      data-testid="floating-extend"
      className={`absolute z-40 bottom-3 rounded-2xl bg-accent text-on-accent shadow-[0_12px_32px_rgba(0,0,0,0.35)] motion-safe:animate-[extend-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)] ${
        collapsed ? 'left-2 right-2 p-1.5 flex flex-col items-stretch gap-1.5' : 'left-3 right-3 p-3.5 flex flex-col gap-2.5'
      }`}
    >
      {collapsed ? (
        <>
          <TimerReset size={18} className="mx-auto my-1" aria-hidden="true" />
          {EXTEND_SESSION_MINUTES.map(minutes => (
            <button key={minutes} onClick={() => void run(minutes)} disabled={busy} className={`${chip} h-8 text-xs`} title={`Extender ${minutes} minutos`}>
              +{minutes}
            </button>
          ))}
        </>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <TimerReset size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-display text-[0.95rem] font-bold leading-tight">¿Necesitás más tiempo?</p>
              <p className="text-xs opacity-80">
                {minutesLeft === 1 ? 'Queda 1 minuto' : `Quedan ${minutesLeft} minutos`} de sesión.
              </p>
            </div>
            <button
              onClick={() => setHiddenFor(state.sessionDuration)}
              className="p-1 -m-1 rounded-lg hover:bg-black/10"
              title="Ocultar"
              aria-label="Ocultar"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {EXTEND_SESSION_MINUTES.map(minutes => (
              <button key={minutes} onClick={() => void run(minutes)} disabled={busy} className={`${chip} h-9 text-sm`}>
                +{minutes}
              </button>
            ))}
          </div>
          {customOpen ? (
            <div className="flex gap-1.5">
              <input
                type="number"
                autoFocus
                min={LIMITS.minSessionMinutes}
                max={LIMITS.maxSessionMinutes}
                value={custom}
                placeholder="Minutos"
                aria-label="Minutos para extender"
                onChange={e => {
                  setCustom(e.target.value);
                  setError(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') runCustom();
                  if (e.key === 'Escape') setCustomOpen(false);
                }}
                className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white text-on-accent text-sm border-2 border-transparent focus:border-on-accent focus:outline-none"
              />
              <button onClick={runCustom} disabled={busy || custom.trim() === ''} className={`${chip} h-9 px-3 text-sm`}>
                OK
              </button>
            </div>
          ) : (
            <button onClick={() => setCustomOpen(true)} disabled={busy} className="text-xs font-semibold underline underline-offset-2 self-start disabled:opacity-60">
              Otro tiempo
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className={`text-[11px] font-semibold ${collapsed ? 'text-center' : ''}`}>
          {error}
        </p>
      )}
    </div>
  );
}
