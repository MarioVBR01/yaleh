/**
 * @file TimeWarningToast.tsx
 * @description Aviso "Te quedan N minutos de sesión" (ORION #13 y #33): notificación dentro de
 * YALEH, no de Windows (no saca al estudiante del kiosko).
 * - Los minutos se eligen en la configuración (`endWarningMinutes`; 0 = desactivado).
 * - Sale una vez por sesión, y otra vez si la sesión se extiende (cambia la duración).
 * - Franja naranja de todo el ancho, campana que se sacude con un pulso, "+15 min" y
 *   "Otro tiempo" para extender, X para cerrar y una barra que se vacía en 10 s (se cierra sola;
 *   mientras se escriben los minutos, espera).
 * - Sin animación si el sistema pide reducir movimiento o con "Reducir animaciones".
 * Ocupa su propio lugar arriba del área de trabajo (no flota): así la pestaña externa
 * (WebContentsView, que se dibuja encima de la interfaz) se achica y el aviso siempre se ve.
 */

import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { LIMITS } from '@shared/config';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { useApp } from '../context/AppContext';
import { playAlarm } from '../lib/alarm';
import { useExtendSession } from './useExtendSession';

/** Segundos que se ve el aviso si no se cierra. */
export const TIME_WARNING_SECONDS = 10;
/** Minutos del botón rápido del aviso. */
const QUICK_EXTEND_MINUTES = 15;

export default function TimeWarningToast() {
  const { state } = useApp();
  const { allowed: canExtend, extend } = useExtendSession();
  const warningMinutes = state.settings?.settings.endWarningMinutes ?? 0;
  const [visibleMinutes, setVisibleMinutes] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Sesión (y duración, que cambia al extender) para la que ya se mostró. */
  const shownFor = useRef<string | null>(null);

  const sessionKey = `${state.workspaceId ?? ''}|${state.sessionDuration}`;
  const remaining = state.timeRemaining;

  useEffect(() => {
    if (warningMinutes <= 0 || state.sessionDuration <= warningMinutes * 60) return;
    if (remaining <= 0 || remaining > warningMinutes * 60) return;
    if (shownFor.current === sessionKey) return;
    shownFor.current = sessionKey;
    setVisibleMinutes(Math.max(1, Math.ceil(remaining / 60)));
    setCustomOpen(false);
    setError(null);
    // Alarma con el sonido y el volumen de la configuración (ORION #19).
    const s = state.settings?.settings;
    playAlarm(s?.alarmSound ?? DEFAULT_SETTINGS.alarmSound, s?.alarmVolume ?? DEFAULT_SETTINGS.alarmVolume, 'end');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, warningMinutes, sessionKey, state.sessionDuration]);

  // Se cierra solo a los 10 s, salvo mientras se escriben otros minutos.
  useEffect(() => {
    if (visibleMinutes === null || customOpen) return;
    const timer = setTimeout(() => setVisibleMinutes(null), TIME_WARNING_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [visibleMinutes, customOpen]);

  const extendFromToast = async (minutes: number) => {
    setBusy(true);
    setError(null);
    try {
      await extend(minutes);
      setVisibleMinutes(null);
      setCustomOpen(false);
      setCustom('');
    } catch (err) {
      console.error('No se pudo extender la sesión:', err);
      setError('No se pudo extender.');
    } finally {
      setBusy(false);
    }
  };

  const extendCustom = () => {
    const minutes = Number(custom.trim());
    if (!Number.isInteger(minutes) || minutes < LIMITS.minSessionMinutes || minutes > LIMITS.maxSessionMinutes) {
      setError(`Entre ${LIMITS.minSessionMinutes} y ${LIMITS.maxSessionMinutes} minutos.`);
      return;
    }
    void extendFromToast(minutes);
  };

  if (visibleMinutes === null) return null;
  const button = 'h-11 px-4 rounded-xl bg-black text-accent text-sm font-bold hover:bg-black/80 disabled:opacity-60 flex-shrink-0';
  return (
    <div
      role="alert"
      data-testid="time-warning"
      className="relative flex-shrink-0 w-full bg-accent text-on-accent overflow-hidden motion-safe:animate-[warning-in_0.45s_cubic-bezier(0.34,1.56,0.64,1)]"
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="relative flex-shrink-0">
          <span className="absolute inset-0 rounded-full bg-black/40 motion-safe:animate-ping" aria-hidden="true" />
          <span className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black text-accent">
            <BellRing size={24} className="motion-safe:animate-[bell-shake_1.2s_ease-in-out_infinite] origin-top" />
          </span>
        </div>
        <p className="flex-1 min-w-0 text-[30px] leading-tight font-bold">
          Te quedan {visibleMinutes} {visibleMinutes === 1 ? 'minuto' : 'minutos'} de sesión
        </p>
        {canExtend &&
          (customOpen ? (
            <div className="flex items-center gap-2 flex-shrink-0">
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
                  if (e.key === 'Enter') extendCustom();
                  if (e.key === 'Escape') setCustomOpen(false);
                }}
                className="w-28 h-11 px-3 rounded-xl bg-white text-on-accent text-sm border-2 border-transparent focus:border-on-accent focus:outline-none"
              />
              <button onClick={extendCustom} disabled={busy || custom.trim() === ''} className={button}>
                Extender
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => void extendFromToast(QUICK_EXTEND_MINUTES)} disabled={busy} className={button}>
                +{QUICK_EXTEND_MINUTES} min
              </button>
              <button
                onClick={() => setCustomOpen(true)}
                disabled={busy}
                className="h-11 px-4 rounded-xl border-2 border-on-accent text-on-accent text-sm font-bold hover:bg-black/10 disabled:opacity-60 flex-shrink-0"
              >
                Otro tiempo
              </button>
            </>
          ))}
        <button onClick={() => setVisibleMinutes(null)} className="p-2 rounded-lg text-on-accent hover:bg-black/10 flex-shrink-0" title="Cerrar aviso">
          <X size={20} />
        </button>
      </div>
      {error && <p className="px-5 -mt-2 pb-3 text-sm font-semibold">{error}</p>}
      {/* Barra que se vacía en 10 s (se detiene mientras se escriben otros minutos). */}
      {!customOpen && (
        <div className="h-1.5 bg-black/20" aria-hidden="true">
          <div
            key={visibleMinutes}
            data-testid="time-warning-countdown"
            className="h-full bg-black origin-left motion-safe:animate-[warning-drain_linear_forwards]"
            style={{ animationDuration: `${TIME_WARNING_SECONDS}s` }}
          />
        </div>
      )}
    </div>
  );
}
