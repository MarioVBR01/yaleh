/**
 * @file TimerSelectPhase.tsx
 * @description Fase 3: Selector de tiempo de sesión de estudio.
 * Opciones rápidas: 25, 50 y 90 minutos.
 * Entrada manual personalizada (máximo definido en shared/config.ts).
 * Al continuar pasa a la pantalla de confirmación; el kiosko lo activa el proceso principal.
 * Vista compacta, sin scroll (ORION #3): botones rápidos chicos, sin el aviso de "Modo kiosko"
 * (la advertencia ya está en el encabezado) ni los consejos de 25/50/90 min.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Shield, Brain } from 'lucide-react';
import { LIMITS } from '@shared/config';
import { useApp } from '../context/AppContext';

/** Opciones rápidas de tiempo de sesión en minutos */
const QUICK_OPTIONS = [
  { minutes: 25, label: '25 min', color: 'from-green-500 to-emerald-600' },
  { minutes: 50, label: '50 min', color: 'from-blue-500 to-blue-600' },
  { minutes: 90, label: '90 min', color: 'from-purple-500 to-purple-600' },
];

export default function TimerSelectPhase() {
  const { dispatch } = useApp();
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');

  /**
   * Devuelve los minutos finales a usar para la sesión.
   * Prioriza la entrada manual si está disponible.
   */
  const getEffectiveMinutes = (): number => {
    // Number() rechaza entradas como "10abc" (parseInt las aceptaba como 10).
    if (customMinutes.trim() !== '') return Number(customMinutes);
    return selectedMinutes ?? 0;
  };

  const effectiveMinutes = getEffectiveMinutes();
  const isValid =
    Number.isInteger(effectiveMinutes) &&
    effectiveMinutes >= LIMITS.minSessionMinutes &&
    effectiveMinutes <= LIMITS.maxSessionMinutes;

  /**
   * Guarda la duración elegida y pasa a la pantalla de confirmación.
   */
  const handleContinue = () => {
    if (!isValid) return;
    dispatch({ type: 'SET_SESSION_DURATION', payload: effectiveMinutes * 60 });
    dispatch({ type: 'SET_PHASE', payload: 'confirm-session' });
  };

  /** Formatea minutos a texto legible */
  const formatDuration = (min: number) => {
    if (min < 60) return `${min} minutos`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h} hora${h > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-2xl shadow-blue-500/30"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Clock size={32} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">¿Cuánto tiempo estudiarás?</h1>
          <p className="text-slate-400 text-sm">
            Al confirmar, el entorno se bloqueará hasta que el tiempo expire.
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          {/* Opciones rápidas */}
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
            Selección Rápida
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {QUICK_OPTIONS.map(opt => (
              <motion.button
                key={opt.minutes}
                onClick={() => {
                  setSelectedMinutes(opt.minutes);
                  setCustomMinutes('');
                }}
                className={`relative py-2 rounded-xl border-2 text-center transition-all overflow-hidden ${
                  selectedMinutes === opt.minutes && !customMinutes
                    ? 'border-blue-500 bg-blue-500/15'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/60'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {selectedMinutes === opt.minutes && !customMinutes && (
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-10`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                  />
                )}
                <div className="relative text-white font-bold">{opt.label}</div>
              </motion.button>
            ))}
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">o personaliza</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Entrada manual */}
          <div className="mb-6">
            <label className="text-slate-400 text-xs font-medium block mb-2">
              Minutos personalizados ({LIMITS.minSessionMinutes}–{LIMITS.maxSessionMinutes})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={LIMITS.minSessionMinutes}
                max={LIMITS.maxSessionMinutes}
                placeholder="Ej: 45"
                value={customMinutes}
                onChange={e => {
                  setCustomMinutes(e.target.value);
                  setSelectedMinutes(null);
                }}
                className="flex-1 bg-slate-800 border border-slate-600 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none transition-colors"
              />
              <div className="text-slate-500 text-sm">minutos</div>
            </div>
          </div>

          {/* Preview de duración */}
          {isValid && (
            <motion.div
              className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Brain size={20} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-blue-300 font-medium text-sm">Sesión: {formatDuration(effectiveMinutes)}</p>
                <p className="text-slate-500 text-xs">Confirmarás en el siguiente paso</p>
              </div>
            </motion.div>
          )}

          {/* Botón de activación */}
          <motion.button
            onClick={handleContinue}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all ${
              isValid
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            whileHover={isValid ? { scale: 1.02 } : {}}
            whileTap={isValid ? { scale: 0.98 } : {}}
          >
            <Shield size={18} />
            {isValid
              ? `Continuar con ${formatDuration(effectiveMinutes)}`
              : 'Selecciona una duración'}
            {isValid && <ChevronRight size={16} />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
