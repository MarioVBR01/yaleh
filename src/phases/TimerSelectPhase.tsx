/**
 * @file TimerSelectPhase.tsx
 * @description Duración de la sesión (web y flujo local del escritorio).
 * Diseño (ORION #38, docs/diseno/maquetas/web.html, pantalla 3): tres tarjetas sin emojis (25 Pomodoro,
 * 50 Estándar, 90 Extendida) con su explicación adentro, la elegida en naranja, minutos propios
 * (límites en shared/config.ts), aviso de modo kiosko con candado y "Continuar con N min".
 * Al continuar pasa a la pantalla de confirmación; el kiosko lo activa el proceso principal.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';

/** Opciones rápidas de tiempo de sesión en minutos, con su explicación. */
const QUICK_OPTIONS = [
  { minutes: 25, name: 'Pomodoro', hint: 'Un bloque corto' },
  { minutes: 50, name: 'Estándar', hint: 'Flujo profundo' },
  { minutes: 90, name: 'Extendida', hint: 'Un ciclo ultradiano' },
];

export default function TimerSelectPhase() {
  const { state, dispatch } = useApp();
  // Duración predeterminada de la configuración (ORION #7): opción rápida o minutos personalizados.
  const preset = state.settings?.settings.defaultSessionMinutes ?? null;
  const presetIsQuick = preset !== null && QUICK_OPTIONS.some(o => o.minutes === preset);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(presetIsQuick ? preset : null);
  const [customMinutes, setCustomMinutes] = useState(preset !== null && !presetIsQuick ? String(preset) : '');

  // Number() rechaza entradas como "10abc" (parseInt las aceptaba como 10).
  const effectiveMinutes = customMinutes.trim() !== '' ? Number(customMinutes) : (selectedMinutes ?? 0);
  const isValid =
    Number.isInteger(effectiveMinutes) &&
    effectiveMinutes >= LIMITS.minSessionMinutes &&
    effectiveMinutes <= LIMITS.maxSessionMinutes;

  /** Guarda la duración elegida y pasa a la pantalla de confirmación. */
  const handleContinue = () => {
    if (!isValid) return;
    dispatch({ type: 'SET_SESSION_DURATION', payload: effectiveMinutes * 60 });
    dispatch({ type: 'SET_PHASE', payload: 'confirm-session' });
  };

  return (
    <div className="min-h-full bg-canvas flex flex-col items-center px-4 py-10 lg:py-12 gap-7">
      <motion.div className="text-center max-w-[640px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl sm:text-[40px] leading-[1.05] font-extrabold tracking-tight text-ink">¿Cuánto tiempo vas a estudiar?</h1>
        <p className="mt-2.5 text-base text-ink-soft">Durante ese tiempo la computadora queda bloqueada en YALEH.</p>
      </motion.div>

      <div className="w-full max-w-[640px] bg-surface border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_OPTIONS.map(opt => {
            const chosen = selectedMinutes === opt.minutes && !customMinutes;
            return (
              <button
                key={opt.minutes}
                aria-pressed={chosen}
                onClick={() => {
                  setSelectedMinutes(opt.minutes);
                  setCustomMinutes('');
                }}
                className={`rounded-2xl border-[1.5px] px-4 py-[18px] flex flex-col gap-1 text-left transition-colors ${
                  chosen ? 'border-accent bg-accent/15 shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'border-line bg-canvas hover:border-line-strong'
                }`}
              >
                <span className="font-display text-[38px] leading-none font-extrabold tracking-tight text-ink tabular-nums">
                  {opt.minutes}
                  <small className="font-sans text-[15px] font-normal text-ink-soft ml-1 tracking-normal">min</small>
                </span>
                <b className="mt-2 text-sm font-medium text-ink">{opt.name}</b>
                <span className="text-[12.5px] text-ink-muted">{opt.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span className="flex-1 h-px bg-line" />o elegí los minutos<span className="flex-1 h-px bg-line" />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="number"
            min={LIMITS.minSessionMinutes}
            max={LIMITS.maxSessionMinutes}
            placeholder="Ej.: 45"
            aria-label="Minutos propios"
            value={customMinutes}
            onChange={e => {
              setCustomMinutes(e.target.value);
              setSelectedMinutes(null);
            }}
            className="flex-1 h-12 px-4 rounded-xl bg-canvas border border-line focus:border-accent text-ink text-sm placeholder:text-ink-muted focus:outline-none"
          />
          <span className="text-sm text-ink-soft">
            minutos ({LIMITS.minSessionMinutes} a {LIMITS.maxSessionMinutes})
          </span>
        </label>

        <div className="flex gap-3 items-start px-4 py-3.5 rounded-[14px] bg-accent/15 text-ink text-[13.5px]" data-testid="kiosk-note">
          <Lock size={18} className="text-accent-soft mt-px flex-shrink-0" />
          <span>
            <b className="font-medium">Modo kiosko.</b> No vas a poder salir de YALEH hasta que el tiempo llegue a cero.
          </span>
        </div>

        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="h-12 rounded-[14px] text-[15px] font-medium bg-accent hover:bg-accent-strong text-on-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValid ? `Continuar con ${effectiveMinutes} min` : 'Elegí una duración'}
        </button>
      </div>
    </div>
  );
}
