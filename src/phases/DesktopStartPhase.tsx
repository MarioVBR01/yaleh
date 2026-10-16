/**
 * @file DesktopStartPhase.tsx
 * @description Bienvenida de la app de escritorio (brief, revisión 1.5; diseño ORION #30,
 * docs/diseno/maquetas/bienvenida.html): logo, título, subtítulo e "Iniciar" sobre el fondo, sin recuadro.
 * El escritorio no inicia sesión con Google:
 * - "Iniciar": flujo local (dropzone → tiempo → confirmación → kiosko).
 * - El .yaleh se abre con doble clic (asociación en el instalador, fase 11), por los argumentos de
 *   arranque o una segunda instancia. "Abrir archivo de sesión" y el arrastre solo existen en
 *   desarrollo (import.meta.env.DEV) hasta que la fase 11 asocie la extensión.
 * - Sin conexión, un aviso dice con qué se va a estudiar (asistente sin conexión o no instalado).
 *   Instalar o eliminar el asistente está en Configuración → IA sin conexión.
 * - Configuración (ORION #7): engranaje arriba a la derecha. Saludo con el nombre, arriba a la izquierda.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Loader2, Play, Settings, WifiOff } from 'lucide-react';
import { SESSION_FILE_EXTENSION } from '@shared/session-file';
import Logo from '../components/Logo';
import { useApp } from '../context/AppContext';
import { newId } from '../data/workspace';
import { getElectronAPI } from '../lib/electron';
import { applyOpenedSessionFile } from '../lib/session-file';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Abrir y arrastrar el .yaleh desde la bienvenida: solo en desarrollo (hasta la fase 11). */
function devSessionFileTools(): boolean {
  return Boolean(import.meta.env.DEV);
}

export default function DesktopStartPhase() {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const [opening, setOpening] = useState(false);
  const [dragging, setDragging] = useState(false);
  const devTools = devSessionFileTools();

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

  const handleOpenFile = async () => {
    if (!api) return;
    setOpening(true);
    dispatch({ type: 'SET_NOTICE', payload: null });
    try {
      applyOpenedSessionFile(dispatch, await api.openSessionFileDialog());
    } finally {
      setOpening(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = [...e.dataTransfer.files].find(f => f.name.toLowerCase().endsWith(SESSION_FILE_EXTENSION));
    if (!api) return;
    if (!file) {
      dispatch({ type: 'SET_NOTICE', payload: 'Arrastra un archivo de sesión con extensión .yaleh.' });
      return;
    }
    setOpening(true);
    dispatch({ type: 'SET_NOTICE', payload: null });
    try {
      applyOpenedSessionFile(dispatch, await api.openSessionFileContent(await file.text()));
    } finally {
      setOpening(false);
    }
  };

  const dropHandlers = devTools
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e: React.DragEvent) => void handleDrop(e),
      }
    : {};

  return (
    <div className={`relative min-h-screen bg-canvas overflow-hidden flex flex-col ${dragging ? 'ring-4 ring-inset ring-accent' : ''}`} {...dropHandlers}>
      {/* Resplandor naranja suave detrás del logo */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--color-accent) 15%, transparent) 0%, transparent 60%)' }}
      />

      {profileName && (
        <p className="absolute top-8 left-8 text-sm text-ink-muted">
          Hola, <b className="text-ink font-medium">{profileName}</b>
        </p>
      )}

      <button
        onClick={() => dispatch({ type: 'SET_PHASE', payload: 'settings' })}
        disabled={opening}
        aria-label="Configuración"
        className="group absolute top-6 right-6 w-12 h-12 rounded-[14px] border border-line bg-surface text-ink-soft hover:text-ink hover:border-line-strong grid place-items-center disabled:opacity-60"
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

        <button
          onClick={handleStart}
          disabled={opening}
          className="h-16 min-w-[320px] px-8 rounded-[18px] text-lg font-semibold bg-accent hover:bg-accent-strong text-on-accent transition-colors flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <Play size={20} fill="currentColor" /> Iniciar
        </button>

        {state.connection === 'offline' && (
          <div role="status" data-testid="offline-note" className="max-w-[520px] flex items-center gap-3 px-4 py-3 rounded-[14px] border border-line bg-surface text-[13.5px] text-ink-soft">
            <WifiOff size={18} className="text-accent-soft flex-shrink-0" />
            {aiState === 'installed' ? (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> Vas a estudiar con el asistente sin conexión: chat, resumen, tarjetas
                y cuestionario con tus documentos.
              </span>
            ) : aiState === 'unsupported' ? (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> Este equipo no cumple los requisitos del asistente sin conexión:
                vas a estudiar con tus documentos y las notas.
              </span>
            ) : (
              <span>
                <b className="text-ink font-medium">Estás sin conexión.</b> El asistente sin conexión no está instalado: se descarga desde la página
                de YALEH. Mientras tanto, vas a estudiar con tus documentos y las notas.
              </span>
            )}
          </div>
        )}

        {devTools && (
          <div className="flex flex-col items-center gap-1" data-testid="dev-session-file">
            <button
              onClick={() => void handleOpenFile()}
              disabled={opening}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink-muted hover:text-ink border border-dashed border-line hover:border-line-strong disabled:opacity-60"
            >
              {opening ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              Abrir archivo de sesión (.yaleh)
            </button>
            <p className="text-ink-subtle text-[11px]">Solo en desarrollo: también puedes arrastrar el .yaleh a esta ventana.</p>
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
