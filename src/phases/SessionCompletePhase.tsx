/**
 * @file SessionCompletePhase.tsx
 * @description Fase final: Pantalla de resumen cuando termina la sesión en modo kiosko.
 * Muestra métricas de la sesión (duración, sitios visitados, archivos cargados)
 * y permite cerrar la aplicación. En el escritorio permite extender la sesión con más
 * minutos (ORION #2): el proceso principal vuelve a bloquear y suma el tiempo.
 * Diseño (ORION #42): composición de la bienvenida (logo, título con punto naranja, resplandor),
 * solo tokens del diseño nuevo, en modo claro y oscuro.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, FileText, Globe, Lock, TimerReset } from 'lucide-react';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { closeApp, getElectronAPI } from '../lib/electron';
import ExtendControls from '../kiosk/ExtendControls';

/**
 * Formatea la fecha/hora actual en español.
 */
function formatSessionDateTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formatted = formatter.format(now);
  // Capitalizar la primera letra del día de la semana
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Convierte segundos a formato de minutos legible.
 */
function formatMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export default function SessionCompletePhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const [extendError, setExtendError] = useState<string | null>(null);
  // Se puede desactivar en la configuración (ORION #7).
  const canExtend = Boolean(api) && state.settings?.settings.allowExtend !== false;

  /** Vuelve al kiosko con la misma sesión y más minutos (lo decide el proceso principal). */
  const handleExtend = async (minutes: number) => {
    if (!api) return;
    setExtendError(null);
    try {
      const snapshot = await api.extendSession(minutes * 60);
      dispatch({
        type: 'RESUME_SESSION',
        payload: {
          durationSeconds: snapshot.durationSeconds,
          remainingSeconds: snapshot.remainingSeconds,
          mode: snapshot.mode,
        },
      });
    } catch (err) {
      console.error('No se pudo extender la sesión:', err);
      setExtendError('No se pudo extender la sesión. Puedes empezar una nueva desde la bienvenida.');
    }
  };


  // Métricas de la sesión
  const studyMinutes = formatMinutes(state.sessionDuration);
  const sitesVisited = state.tabs.filter(t => t.type === 'workspace-url').length;
  const filesImported = state.uploadedFiles.length;
  const sessionDateTime = formatSessionDateTime();
  const stats = [
    { label: studyMinutes === 1 ? 'Minuto' : 'Minutos', value: studyMinutes, icon: Clock },
    { label: sitesVisited === 1 ? 'Sitio visitado' : 'Sitios visitados', value: sitesVisited, icon: Globe },
    { label: filesImported === 1 ? 'Archivo cargado' : 'Archivos cargados', value: filesImported, icon: FileText },
  ];

  return (
    <div className="relative min-h-full bg-canvas overflow-hidden flex flex-col">
      {/* Misma composición que la bienvenida (ORION #42): resplandor suave y contenido centrado, sin recuadro. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[34%] w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-accent) 15%, transparent) 0%, transparent 60%)' }}
      />

      <motion.div
        className="relative flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative">
          <Logo size={112} />
          <span
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-success text-canvas grid place-items-center border-4 border-canvas"
            aria-hidden="true"
          >
            <Check size={20} strokeWidth={3} />
          </span>
        </div>

        <div className="text-center">
          <h1 className="font-display text-4xl sm:text-[3.25rem] leading-none font-extrabold tracking-tight text-ink">
            Sesión completada<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-[1.0625rem] font-light text-ink-soft">Terminaste tu tiempo de estudio sin distracciones.</p>
        </div>

        <div className="w-full max-w-[560px] grid grid-cols-3 gap-3" aria-label="Resumen de la sesión">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} data-testid="session-stat" className="rounded-2xl border border-line bg-surface p-4 text-center">
              <Icon size={18} className="mx-auto mb-2 text-accent-soft" />
              <div className="font-mono text-[1.75rem] leading-none font-bold text-ink tabular-nums">{value}</div>
              <div className="mt-1.5 text-xs text-ink-muted">{label}</div>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-2 text-[0.8125rem] text-ink-muted">
          <Calendar size={15} className="text-accent-soft" /> Guardada en el historial de este equipo · {sessionDateTime}
        </p>

        {/* Extender la sesión (escritorio): mismos materiales, notas y espacio de trabajo */}
        {canExtend && (
          <section className="w-full max-w-[560px] rounded-2xl border border-line bg-surface p-5" aria-label="Extender la sesión">
            <p className="text-ink text-sm font-medium mb-1 flex items-center gap-2">
              <TimerReset size={16} className="text-accent-soft" /> ¿Querés seguir estudiando?
            </p>
            <p className="text-ink-muted text-xs mb-3">Extendé la sesión con los mismos materiales; la computadora vuelve a quedar bloqueada.</p>
            <ExtendControls onExtend={handleExtend} />
            {extendError && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {extendError}
              </p>
            )}
          </section>
        )}

        <button
          onClick={closeApp}
          className="h-14 min-w-[320px] px-8 rounded-[18px] text-base font-semibold bg-accent hover:bg-accent-strong text-on-accent flex items-center justify-center gap-2.5 transition-colors"
        >
          <Lock size={18} /> Cerrar aplicación
        </button>
      </motion.div>

      <p className="relative text-center text-xs text-ink-muted pb-6">YALEH v{api?.version ?? '0.1'} · TECBA 2026 · Proyecto de grado</p>
    </div>
  );
}
