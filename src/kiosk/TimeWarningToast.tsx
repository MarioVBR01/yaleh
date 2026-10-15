/**
 * @file TimeWarningToast.tsx
 * @description Aviso "Te quedan N minutos de sesión" (ORION #13): notificación dentro de YALEH,
 * no de Windows (no saca al estudiante del kiosko).
 * - Los minutos se eligen en la configuración (`endWarningMinutes`; 0 = desactivado).
 * - Sale una vez por sesión, y otra vez si la sesión se extiende (cambia la duración).
 * - Se cierra con la X o sola a los pocos segundos.
 * Ocupa su propio lugar arriba del área de trabajo (no flota): así la pestaña externa
 * (WebContentsView, que se dibuja encima de la interfaz) se achica y el aviso siempre se ve.
 */

import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Segundos que se ve el aviso si no se cierra. */
export const TIME_WARNING_SECONDS = 10;

export default function TimeWarningToast() {
  const { state } = useApp();
  const warningMinutes = state.settings?.settings.endWarningMinutes ?? 0;
  const [visibleMinutes, setVisibleMinutes] = useState<number | null>(null);
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
  }, [remaining, warningMinutes, sessionKey, state.sessionDuration]);

  useEffect(() => {
    if (visibleMinutes === null) return;
    const timer = setTimeout(() => setVisibleMinutes(null), TIME_WARNING_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [visibleMinutes]);

  if (visibleMinutes === null) return null;
  return (
    <div className="flex-shrink-0 px-3 pt-3" data-testid="time-warning">
      <div
        role="alert"
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/40 bg-surface shadow-lg text-sm text-ink"
      >
        <BellRing size={18} className="text-warning flex-shrink-0" />
        <p className="flex-1">
          Te quedan <strong>{visibleMinutes} {visibleMinutes === 1 ? 'minuto' : 'minutos'}</strong> de sesión.
        </p>
        <button onClick={() => setVisibleMinutes(null)} className="p-1 rounded text-ink-muted hover:text-ink" title="Cerrar aviso">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
