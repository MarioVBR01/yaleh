/**
 * @file DesktopStartPhase.tsx
 * @description Bienvenida de la app de escritorio (brief, revisión 1.5; diseño ORION #30,
 * docs/diseno/maquetas/bienvenida.html): logo, título, subtítulo e "Iniciar" sobre el fondo, sin recuadro.
 * El escritorio no inicia sesión con Google:
 * - "Iniciar": flujo local (dropzone → tiempo → confirmación → kiosko). Es el módulo IA Local, sin cuenta:
 *   siempre sin conexión, aunque haya internet. La sesión en línea solo se abre con un .yaleh.
 * - El .yaleh se abre solo con doble clic (asociación en el instalador): llega por los argumentos de
 *   arranque o por una segunda instancia. La aplicación no abre ninguna ventana de archivos de Windows.
 * - Con conexión, una nota explica cómo tener Gemini y las herramientas de Google (solo texto: la app
 *   no abre el navegador). Sin conexión, un aviso dice con qué se va a estudiar (IA Local o no instalada).
 *   Instalar o eliminar el asistente está en Configuración → IA Local.
 * - Configuración (ORION #7): engranaje arriba a la derecha.
 */

import { motion } from 'framer-motion';
import { Globe, Play, Settings, WifiOff } from 'lucide-react';
import { YALEH_WEB_HOST } from '@shared/config';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { newId } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DesktopStartPhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();

  const profileName = state.settings?.profileName ?? null;
  const aiState = state.localAi?.state;

  /** Flujo local: espacio de trabajo nuevo en SQLite (su id será el de la sesión). */
  const handleStart = () => {
    dispatch({ type: 'SET_NOTICE', payload: null });
    dispatch({ type: 'SET_WORKSPACE', payload: newId() });
    dispatch({ type: 'SET_FILES', payload: [] });
    dispatch({
      type: 'SET_SESSION',
      payload: { isAuthenticated: false, isAnonymous: true, displayName: profileName ?? 'Estudiante', initials: initialsOf(profileName ?? 'Estudiante') },
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden flex flex-col">
      {/* Resplandor naranja suave detrás del logo */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-accent) 15%, transparent) 0%, transparent 60%)' }}
      />

      <button
        onClick={() => dispatch({ type: 'SET_PHASE', payload: 'settings' })}
        aria-label="Configuración"
        className="group absolute top-6 right-6 w-12 h-12 rounded-[14px] border border-line bg-surface text-ink-soft hover:text-ink hover:border-line-strong grid place-items-center"
      >
        <Settings size={22} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-full right-0 mt-2 px-2 py-1 rounded-lg bg-inverse text-on-inverse text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        >
          Configuración
        </span>
      </button>

      <motion.div
        className="relative flex-1 flex flex-col items-center justify-center gap-7 px-4 pb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Logo size={168} />
        <div className="text-center">
          <h1 className="font-display text-5xl sm:text-[64px] leading-none font-extrabold tracking-tight text-ink">
            Bienvenido a YALEH<span className="text-accent">.</span>
          </h1>
          <p className="mt-3 text-[19px] font-light text-ink-soft">Tu entorno de estudio sin distracciones.</p>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <button
            onClick={handleStart}
            className="h-16 min-w-[320px] px-8 rounded-[18px] text-lg font-semibold bg-accent hover:bg-accent-strong text-on-accent transition-colors flex items-center justify-center gap-3"
          >
            <Play size={20} fill="currentColor" /> Iniciar
          </button>
          <p data-testid="local-module-note" className="text-[13.5px] text-ink-soft text-center">
            {aiState === 'unsupported'
              ? 'Módulo IA Local: este equipo no cumple los requisitos de la IA; puedes estudiar con tus archivos, notas y Pomodoro.'
              : aiState && aiState !== 'installed'
                ? 'Módulo IA Local: descarga el modelo en Configuración para usar la IA sin internet.'
                : 'Módulo IA Local: tus archivos, notas, Pomodoro y la IA que funciona en tu computadora, sin internet.'}
          </p>
        </div>

        {state.connection === 'online' && (
          <div role="status" data-testid="online-note" className="max-w-[520px] flex items-center gap-3 px-4 py-3 rounded-[14px] border border-line bg-surface text-[13.5px] text-ink-soft">
            <Globe size={18} className="text-accent-soft flex-shrink-0" />
            <span>
              <b className="text-ink font-medium">¿Quieres Gemini y las herramientas de Google con tu cuenta?</b> Prepara tu sesión en {YALEH_WEB_HOST} y abre
              el archivo .yaleh con doble clic.
            </span>
          </div>
        )}

        {state.connection === 'offline' && (
          <div role="status" data-testid="offline-note" className="max-w-[520px] flex items-center gap-3 px-4 py-3 rounded-[14px] border border-line bg-surface text-[13.5px] text-ink-soft">
            <WifiOff size={18} className="text-accent-soft flex-shrink-0" />
            {aiState === 'installed' ? (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> Vas a estudiar con la IA Local: chat, resumen, tarjetas
                y cuestionario con tus documentos.
              </span>
            ) : aiState === 'unsupported' ? (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> Este equipo no cumple los requisitos de la IA Local:
                vas a estudiar con tus documentos y las notas.
              </span>
            ) : (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> La IA Local no está instalada: se descarga desde la página
                de YALEH. Mientras tanto, vas a estudiar con tus documentos y las notas.
              </span>
            )}
          </div>
        )}

        {state.notice && (
          <p role="alert" className="max-w-[520px] p-3 rounded-xl border border-danger/40 bg-danger/10 text-sm text-ink-soft text-center">
            {state.notice}
          </p>
        )}
      </motion.div>

      <p className="absolute left-0 right-0 bottom-6 text-center text-xs text-ink-muted">
        YALEH v{api?.version ?? ''} · TECBA 2026 · Proyecto de grado
      </p>
    </div>
  );
}
